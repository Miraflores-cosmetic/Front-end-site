import React, {lazy, Suspense, useEffect} from 'react';
import styles from './ArticleDetail.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import {SpinnerLoader} from "@/components/spinner/SpinnerLoader";
import { useLocation } from 'react-router-dom';

const LazyComponent = lazy(() => import('./LazyComponent'));

const ArticleDetail: React.FC = () => {
  const location = useLocation();
  const isInfoPage = location.pathname.startsWith('/info/');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <article className={`${styles.articlesDetails} ${isInfoPage ? styles.infoPage : ''}`}>
        <Suspense fallback={<SpinnerLoader/>}>
          <LazyComponent/>
        </Suspense>
        <section className={styles.bottomPart}>
          <Bestsellers />
          <Footer footerImage={footerImage} />
        </section>
      </article>
    </>
  );
};

export default ArticleDetail;
