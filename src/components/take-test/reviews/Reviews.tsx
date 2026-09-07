import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Reviews.module.scss';
import { Review, resolveReviewKind } from './review/Review';
import {
  getLatestPublishedReviews,
  getProductPublishedReviews,
  getPublishedReviewsPage,
  type PublishedReview,
} from '@/api/reviewsApi';
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
  authorName: string | null;
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
  const author = r.authorName?.trim() || '';
  return {
    id: r.id,
    kind,
    mediaUrl,
    title: r.product.name,
    subtitle: r.product.shortDescription?.trim() || '',
    authorName: author && author !== 'Покупатель' ? author : null,
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
      authorName={review.authorName}
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
  /** Имя товара для SEO / заголовка (обновляется после загрузки). */
  onProductName?: (name: string | null) => void;
}> = ({ variant = 'preview', productSlug, onProductName }) => {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterProductName, setFilterProductName] = useState<string | null>(null);
  const showAll = variant === 'page';
  const HeadingTag = showAll ? 'h1' : 'h2';

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (showAll) {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        try {
          const data = productSlug
            ? await getProductPublishedReviews(productSlug, nextPage, PAGE_SIZE)
            : await getPublishedReviewsPage(nextPage, PAGE_SIZE);
          const mapped = data.items.map(mapReview);
          setReviews((prev) => (append ? [...prev, ...mapped] : mapped));
          setTotal(data.total);
          setPage(data.page);
          if (productSlug) {
            const name =
              data.product?.name?.trim() || mapped[0]?.title || productSlug;
            setFilterProductName(name);
            onProductName?.(name);
          } else {
            setFilterProductName(null);
            onProductName?.(null);
          }
        } catch (err) {
          console.error('Error loading reviews:', err);
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Не удалось загрузить отзывы';
          setError(message);
          if (!append) {
            setReviews([]);
            setTotal(0);
          }
          if (productSlug) {
            setFilterProductName(productSlug);
            onProductName?.(null);
          }
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getLatestPublishedReviews(PREVIEW_LIMIT);
        setReviews(data.map(mapReview));
        setTotal(data.length);
        setFilterProductName(null);
      } catch (err) {
        console.error('Error loading reviews:', err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'Не удалось загрузить отзывы',
        );
        setReviews([]);
      } finally {
        setLoading(false);
      }
    },
    [showAll, productSlug, onProductName],
  );

  useEffect(() => {
    void loadPage(1, false);
  }, [loadPage]);

  const hasMore = showAll && !error && reviews.length < total;
  const chipLabel = filterProductName || productSlug || '';

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

      {showAll && productSlug ? (
        <div className={styles.filterRow}>
          <Link
            to="/reviews"
            className={styles.filterChip}
            aria-label={`Сбросить фильтр по товару «${chipLabel}»`}
            title="Показать все отзывы"
          >
            <span className={styles.filterChipLabel}>{chipLabel}</span>
            <span className={styles.filterChipClear} aria-hidden>
              ×
            </span>
          </Link>
        </div>
      ) : null}

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

      {!loading && error ? (
        <div className={styles.errorState} role="alert">
          <p className={styles.noReviews}>{error}</p>
          <button
            type="button"
            className={styles.loadMoreBtn}
            onClick={() => void loadPage(1, false)}
          >
            Повторить
          </button>
        </div>
      ) : null}

      {!loading && !error && reviews.length > 0 && !showAll ? (
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

      {!loading && !error && reviews.length > 0 && showAll ? (
        <div className={styles.pageGrid}>
          {reviews.map((review) => (
            <div key={review.id} className={styles.pageGridItem}>
              <ReviewCardView review={review} />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && reviews.length === 0 ? (
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
