import React, { useCallback, useEffect, useState } from 'react';
import styles from './Reviews.module.scss';
import { Review, resolveReviewKind } from './review/Review';
import {
  getLatestPublishedReviews,
  getProductPublishedReviews,
  getPublishedReviewsPage,
  type PublishedReview,
} from '@/graphql/queries/reviewsAll.service';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';
import {
  ProductScrollStrip,
  ProductScrollStripItem,
} from '@/components/product-scroll-strip/ProductScrollStrip';

type ReviewCardData = {
  id: string;
  kind: ReturnType<typeof resolveReviewKind>['kind'];
  mediaUrl: string | null;
  title: string;
  subtitle: string;
  text: string;
  rating: number;
  date: string;
  productSlug?: string;
  productThumb: string | null;
};

const PAGE_SIZE = 20;
const PREVIEW_LIMIT = 12;

function formatReviewDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function mapReview(r: PublishedReview): ReviewCardData {
  const { kind, mediaUrl } = resolveReviewKind([r.image1, r.image2]);
  return {
    id: r.id,
    kind,
    mediaUrl,
    title: r.product.name,
    subtitle: r.product.shortDescription?.trim() || '',
    text: r.text,
    rating: r.rating,
    date: formatReviewDate(r.createdAt),
    productSlug: r.product.slug,
    productThumb: r.product.thumbnail ?? null,
  };
}

function ReviewCardView({ review }: { review: ReviewCardData }) {
  return (
    <Review
      kind={review.kind}
      mediaUrl={review.mediaUrl}
      title={review.title}
      subtitle={review.subtitle}
      text={review.text}
      rating={review.rating}
      date={review.date}
      productSlug={review.productSlug}
      productThumb={review.productThumb}
    />
  );
}

export const Reviews: React.FC<{
  variant?: 'preview' | 'page';
  productSlug?: string;
}> = ({ variant = 'preview', productSlug }) => {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const showAll = variant === 'page';
  const HeadingTag = showAll ? 'h1' : 'h2';

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (showAll) {
        if (append) setLoadingMore(true);
        else setLoading(true);
        try {
          const data = productSlug
            ? await getProductPublishedReviews(productSlug, nextPage, PAGE_SIZE)
            : await getPublishedReviewsPage(nextPage, PAGE_SIZE);
          const mapped = data.items.map(mapReview);
          setReviews((prev) => (append ? [...prev, ...mapped] : mapped));
          setTotal(data.total);
          setPage(data.page);
        } catch (error) {
          console.error('Error loading reviews:', error);
          if (!append) setReviews([]);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
        return;
      }

      setLoading(true);
      try {
        const data = await getLatestPublishedReviews(PREVIEW_LIMIT);
        setReviews(data.map(mapReview));
        setTotal(data.length);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [showAll, productSlug],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const hasMore = showAll && reviews.length < total;

  return (
    <HomeSection
      className={`${styles.reviewsContainer} ${showAll ? styles.reviewsContainerPage : ''}`}
      bleed={!showAll}
      flush={showAll}
    >
      <div className={styles.titleWrapper}>
        <SectionTitleRow className={styles.titleRow}>
          <HeadingTag className={styles.title}>Отзывы</HeadingTag>
          {!showAll ? <MoreLink to="/reviews/" /> : null}
        </SectionTitleRow>
      </div>

      {loading ? (
        <ProductScrollStrip
          size="md"
          itemWidth={400}
          itemWidthMobile={280}
          gap={16}
          gapMobile={10}
          bleed={32}
          bleedMobile={16}
          aria-label="Отзывы: загрузка"
        >
          {Array.from({ length: 4 }, (_, i) => (
            <ProductScrollStripItem key={i}>
              <div className={styles.cardSkeleton} aria-hidden />
            </ProductScrollStripItem>
          ))}
        </ProductScrollStrip>
      ) : null}

      {!loading && reviews.length > 0 && !showAll ? (
        <ProductScrollStrip
          size="md"
          itemWidth={400}
          itemWidthMobile={280}
          gap={16}
          gapMobile={10}
          bleed={32}
          bleedMobile={16}
          aria-label="Отзывы"
        >
          {reviews.map((review) => (
            <ProductScrollStripItem key={review.id}>
              <ReviewCardView review={review} />
            </ProductScrollStripItem>
          ))}
        </ProductScrollStrip>
      ) : null}

      {!loading && reviews.length > 0 && showAll ? (
        <div className={styles.pageGrid}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.pageGridItem}>
              <ReviewCardView review={review} />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && reviews.length === 0 ? (
        <p className={styles.noReviews}>Пока нет отзывов</p>
      ) : null}

      {hasMore ? (
        <div className={styles.loadMoreWrap}>
          <button
            type="button"
            className={styles.loadMoreBtn}
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, true)}
          >
            {loadingMore ? 'Загрузка…' : 'Показать ещё'}
          </button>
        </div>
      ) : null}
    </HomeSection>
  );
};
