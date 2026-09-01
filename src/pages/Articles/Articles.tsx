import React, { useEffect } from 'react';
import styles from './Articles.module.scss';
import { ArticleCard } from './ArticleCard/ArticleCard';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { fetchArticles, shouldRefetchArticles } from '@/store/slices/articlesSlice';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

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
  const articlesState = useSelector((s: RootState) => s.articlesSlice);
  const { items: articles, loading, error } = articlesState;

  useDocumentSeo({
    title: 'Статьи',
    description:
      'Полезные статьи о ботанической косметике с меристемными экстрактами — блог Miraflores.',
    canonicalPath: '/articles',
    ogType: 'website',
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    if (shouldRefetchArticles(articlesState)) {
      void dispatch(fetchArticles(100));
    }
  }, [dispatch, articlesState.fetchedAt, articlesState.items.length, articlesState.loading]);

  const handleRetry = () => {
    void dispatch(fetchArticles(100));
  };

  const showEmpty = !loading && !error && articles.length === 0;

  return (
    <>
      <main className={styles.articlesContainer}>
        <section className={styles.titleContainer}>
          <h1 className={styles.title}>Будь в курсе с Мирафлорес</h1>
          <p className={styles.desc}>ботаническая косметика с меристемными экстрактами</p>
        </section>
        {loading && articles.length === 0 && <ArticlesSkeleton />}
        {error && !loading && (
          <div className={styles.listError} role="alert">
            <p>Не удалось загрузить статьи. Проверьте соединение и попробуйте снова.</p>
            <button type="button" className={styles.retryBtn} onClick={handleRetry}>
              Повторить
            </button>
          </div>
        )}
        {showEmpty ? (
          <div className={styles.emptyState} role="status">
            <p>Пока нет опубликованных статей.</p>
          </div>
        ) : null}
        {!error && articles.length > 0 ? (
          <section className={styles.articlesWrapper}>
            {articles.map((item, index) => (
              <ArticleCard key={item.id} article={item} reverse={index % 2 !== 0} />
            ))}
          </section>
        ) : null}
      </main>
    </>
  );
};

export default Articles;
