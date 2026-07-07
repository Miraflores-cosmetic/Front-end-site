import React, { useEffect, useState } from 'react';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { getSingleProduct } from '@/graphql/queries/products.service';
import { mapProductNodeToBestSeller } from '@/utils/mapProductNodeToBestSeller';
import type { BestSellersProduct } from '@/types/products';
import styles from './QuizProductCards.module.scss';

interface QuizProductCardsProps {
  slugs: string[];
}

export const QuizProductCards: React.FC<QuizProductCardsProps> = ({ slugs }) => {
  const [products, setProducts] = useState<BestSellersProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all(slugs.map((slug) => getSingleProduct(slug)))
      .then((nodes) => {
        if (!active) return;
        const mapped = nodes
          .filter((node): node is NonNullable<typeof node> => node != null)
          .map((node) => mapProductNodeToBestSeller(node));
        setProducts(mapped);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slugs]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <SpinnerLoader />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <div key={product.slug} className={styles.cardSlot}>
          <BestSellerProductCard product={product} loading={false} />
        </div>
      ))}
    </div>
  );
};
