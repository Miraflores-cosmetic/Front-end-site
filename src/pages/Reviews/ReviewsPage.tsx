import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ReviewsPage.module.scss';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import { scrollPageToTopAfterLayout } from '@/utils/scrollPageToTop';

const ReviewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get('product') ?? undefined;
  const [productName, setProductName] = useState<string | null>(null);

  useEffect(() => {
    scrollPageToTopAfterLayout();
  }, [productSlug]);

  const onProductName = useCallback((name: string | null) => {
    setProductName(name);
  }, []);

  const title = productSlug
    ? productName
      ? `Отзывы: ${productName}`
      : 'Отзывы о товаре'
    : 'Отзывы';

  useDocumentSeo({
    title,
    description: productName
      ? `Отзывы покупателей Miraflores о «${productName}».`
      : 'Отзывы покупателей Miraflores о натуральной косметике.',
    canonicalPath: productSlug
      ? `/reviews?product=${encodeURIComponent(productSlug)}`
      : '/reviews',
  });

  return (
    <main className={styles.reviewsPage}>
      <Reviews
        variant="page"
        productSlug={productSlug}
        onProductName={onProductName}
      />
    </main>
  );
};

export default ReviewsPage;
