import React, { lazy, Suspense, useEffect } from 'react';
import styles from './ArticleDetail.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { useLocation } from 'react-router-dom';

const LazyComponent = lazy(() => import('./LazyComponent'));

/** Shell: scroll + Suspense. Bestsellers только у успешной статьи блога (в LazyComponent). */
const ArticleDetail: React.FC = () => {
  const location = useLocation();
  const isInfoPage = location.pathname.startsWith('/info/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <article className={`${styles.articlesDetails} ${isInfoPage ? styles.infoPage : ''}`}>
      <Suspense fallback={<SpinnerLoader />}>
        <LazyComponent />
      </Suspense>
    </article>
  );
};

export default ArticleDetail;
