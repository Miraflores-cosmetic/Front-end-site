import React, { useEffect } from 'react';
import styles from './Articles.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import { ArticleCard } from './ArticleCard/ArticleCard';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { fetchArticles } from '@/store/slices/articlesSlice';

const SKELETON_COUNT = 4;

const ArticlesSkeleton: React.FC = () => (
  <section className={styles.skeletonGrid} aria-hidden>
    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={styles.skeletonThumb} />
        <div className={styles.skeletonBody}>
          <div className={`${styles.skeletonLine} ${styles.short}`} />
          <div className={`${styles.skeletonLine} ${styles.tall}`} />
          <div className={`${styles.skeletonLine} ${styles.medium}`} />
          <div className={`${styles.skeletonLine} ${styles.medium}`} />
        </div>
      </div>
    ))}
  </section>
);

const Articles: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items: articles, loading, error } = useSelector((s: RootState) => s.articlesSlice);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (articles.length === 0) {
      dispatch(fetchArticles(20));
    }
  }, [dispatch, articles.length]);

  const handleRetry = () => {
    dispatch(fetchArticles(20));
  };

  return (
    <>
      <Header />
      <main className={styles.articlesContainer}>
        <section className={styles.titleContainer}>
          <p className={styles.title}>Будь в курсе с Мирафлорес</p>
          <p className={styles.desc}>ботаническая косметика c меристемными экстрактами</p>
        </section>
        {loading && <ArticlesSkeleton />}
        {error && !loading && (
          <div className={styles.listError} role="alert">
            <p>Не удалось загрузить статьи. Проверьте соединение и попробуйте снова.</p>
            <button type="button" className={styles.retryBtn} onClick={handleRetry}>
              Повторить
            </button>
          </div>
        )}
        {!loading && !error && (
          <section className={styles.articlesWrapper}>
            {articles.map((item, index) => (
              <ArticleCard key={item.id} article={item} reverse={index % 2 !== 0} />
            ))}
          </section>
        )}
        <Footer footerImage={footerImage} />
      </main>
    </>
  );
};

export default Articles;
