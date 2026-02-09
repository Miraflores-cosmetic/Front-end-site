import React, {lazy, Suspense} from 'react';
import styles from './ArticleDetail.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import {SpinnerLoader} from "@/components/spinner/SpinnerLoader";

const LazyComponent = lazy(() => import('./LazyComponent'));

const ArticleDetail: React.FC = () => {
  return (
    <article className={styles.articlesDetails}>
      <Header/>
      <Suspense fallback={<SpinnerLoader/>}>
        <LazyComponent/>
      </Suspense>
      <section className={styles.bottomPart}>
        <Bestsellers />
        <Footer footerImage={footerImage} />
      </section>
    </article>
  );
};

export default ArticleDetail;
