import React, {useEffect} from 'react';
import styles from './Articles.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';

import linkedin from '@/assets/icons/linkedin.svg';
import iqs from '@/assets/icons/iqs.svg';
import facebook from '@/assets/icons/facebook.svg';
import insta from '@/assets/icons/insta.svg';

import { ArticleCard } from './ArticleCard/ArticleCard';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "@/store/store";
import {fetchArticles} from "@/store/slices/articlesSlice";
import {SpinnerLoader} from "@/components/spinner/SpinnerLoader";

const Articles: React.FC = () => {

  const dispatch = useDispatch();
  const {items: articles, loading, error} = useSelector((s: RootState) => s.articlesSlice);
  useEffect(() => {
    if (articles.length === 0) {
      dispatch(fetchArticles(20) as any);
    }
  }, [dispatch]);

  return (
    <article className={styles.articlesContainer}>
      <Header/>
      <section className={styles.titleContainer}>
        <p className={styles.title}>Будь в курсе с Мирафлорес</p>
        <p className={styles.desc}>ботаническая косметика c меристемными экстрактами</p>
        <div className={styles.socialWrapper}>
          <img className={styles.socialImage} src={facebook} alt='facebbok'/>
          <img className={styles.socialImage} src={iqs} alt='iqs'/>
          <img className={styles.socialImage} src={insta} alt='insta'/>
          <img className={styles.socialImage} src={linkedin} alt='linkedin'/>
        </div>
      </section>
      {loading && <SpinnerLoader/>}
      {error && <div>Error: {error.message}</div>}
      {!loading &&
        !error &&(<section className={styles.articlesWrapper}>
          {articles.map((item, index) => (
            <ArticleCard key={item.id} article={item} reverse={index % 2 !== 0}/>
          ))}
      </section>)}
      <Footer footerImage={footerImage}/>
    </article>
  );
};

export default Articles;
