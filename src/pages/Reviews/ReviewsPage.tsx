import React from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ReviewsPage.module.scss';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

const ReviewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get('product') ?? undefined;

  useDocumentSeo({
    title: productSlug ? 'Отзывы о товаре' : 'Отзывы',
    description: 'Отзывы покупателей Miraflores о натуральной косметике.',
    canonicalPath: productSlug
      ? `/reviews?product=${encodeURIComponent(productSlug)}`
      : '/reviews',
  });

  return (
    <main className={styles.reviewsPage}>
      <Reviews variant="page" productSlug={productSlug} />
    </main>
  );
};

export default ReviewsPage;
