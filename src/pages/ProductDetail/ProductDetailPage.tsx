import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { getProductBySlug, hydrateProductContent } from '@/store/slices/productSlice';
import type { AppDispatch } from '@/store/store';
import ProductDetailView from './ProductDetailView';
import styles from './ProductDetail.module.scss';

/** Один route-chunk с View; fetch стартует до первого render View. */
export default function ProductDetailPage() {
  const location = useLocation();
  const { slug } = useParams();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const s = slug ?? '';
    dispatch(getProductBySlug({ slug: s }));
    void dispatch(hydrateProductContent(s));
  }, [slug, dispatch]);

  return (
    <article className={styles.bestSellerContainer}>
      <main className={styles.productMain}>
        <ProductDetailView />
      </main>
    </article>
  );
}
