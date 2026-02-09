import React, { useEffect } from 'react';
import styles from './Articles.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import { ArticleCard } from './ArticleCard/ArticleCard';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { fetchArticles } from '@/store/slices/articlesSlice';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';

const Articles: React.FC = () => {
  const dispatch = useDispatch();
  const { items: articles, loading, error } = useSelector((s: RootState) => s.articlesSlice);

  useEffect(() => {
    if (articles.length === 0) {
      dispatch(fetchArticles(20) as any);
    }
  }, [dispatch]);

  return (
    <>
      <Header />
      <main className={styles.articlesContainer}>
        <section className={styles.titleContainer}>
          <p className={styles.title}>Будь в курсе с Мирафлорес</p>
          <p className={styles.desc}>ботаническая косметика c меристемными экстрактами</p>
        </section>
        {loading && <SpinnerLoader />}
        {error && <div>Error: {error.message}</div>}
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
