import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import styles from './ProductDetail.module.scss';

const ProductDetailView = lazy(() => import('./ProductDetailView'));

export default function ProductDetailPage() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <article className={styles.bestSellerContainer}>
      <main className={styles.productMain}>
        <Suspense
          fallback={
            <div className={styles.productLoader}>
              <SpinnerLoader />
            </div>
          }
        >
          <ProductDetailView />
        </Suspense>
      </main>
    </article>
  );
}
