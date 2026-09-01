import React, { useCallback, useEffect, useState } from 'react';
import styles from './Reviews.module.scss';
import { Review } from './review/Review';
import {
  getLatestPublishedReviews,
  getProductPublishedReviews,
  getPublishedReviewsPage,
  type PublishedReview,
} from '@/graphql/queries/reviewsAll.service';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';

interface ReviewData {
  id: string;
  images: string[];
  title: string;
  subtitle: string;
  text: string;
  rating: number;
  date: string;
}

const PAGE_SIZE = 20;
const PREVIEW_LIMIT = 3;

function mapReview(r: PublishedReview): ReviewData {
  const reviewPhotos = [r.image1, r.image2].filter(Boolean) as string[];
  const productThumb = r.product.thumbnail ? [r.product.thumbnail] : [];
  return {
    id: r.id,
    images: reviewPhotos.length > 0 ? reviewPhotos : productThumb,
    title: r.product.name,
    subtitle: r.authorName?.trim() || '',
    text: r.text,
    rating: r.rating,
    date: r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
  };
}

export const Reviews: React.FC<{
  variant?: 'preview' | 'page';
  productSlug?: string;
}> = ({ variant = 'preview', productSlug }) => {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
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
      flush={showAll}
    >
      <div className={styles.titleWrapper}>
        <SectionTitleRow className={styles.titleRow}>
          <HeadingTag className={styles.title}>Отзывы</HeadingTag>
          {!showAll ? <MoreLink to="/reviews/" /> : null}
        </SectionTitleRow>
      </div>

      <div className={styles.reviewsWrapper}>
        <div>
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.reviewSkeleton} aria-hidden="true">
                  <div className={styles.reviewSkeletonImage} />
                  <div className={styles.reviewSkeletonContent}>
                    <div className={styles.reviewSkeletonLine} />
                    <div className={styles.reviewSkeletonLineShort} />
                    <div className={styles.reviewSkeletonLineMid} />
                  </div>
                </div>
              ))}
            </>
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <Review key={review.id} {...review} wideContent />
            ))
          ) : (
            <p className={styles.noReviews}>Пока нет отзывов</p>
          )}

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
        </div>
      </div>
    </HomeSection>
  );
};
