'use client';

import React, {useEffect} from 'react';
import styles from '../ArticleDetail.module.scss';
import {useDispatch, useSelector} from 'react-redux';
import {RootState} from '@/store/store';
import {Link, useParams} from 'react-router-dom';
import back from "@/assets/icons/go-back.svg";
import MaskedImage from "@/components/masked-image/MaskedImage";
import ArticleContent from "@/pages/ArticleDetail/ArticleContent/ArticleContent";
import {fetchArticleBySlug} from "@/store/slices/articleSlice";


const LazyComponent: React.FC = () => {
  const {slug} = useParams();
  const dispatch = useDispatch();
  const {article, loading, error} = useSelector((state: RootState) => state.articleSlice);


  useEffect(() => {
    if (!slug) return;
    dispatch(fetchArticleBySlug(slug) as any);
  }, [slug, dispatch]);


  if (loading) return null;
  if (error) return <div>Ошибка: {error.message}</div>;
  if (!article) return null;

  return (
    <>
      <section className={styles.titleContainer}>
        <div className={styles.goBackWrapper}>
          <img className={styles.back} src={back} alt='go back'/>
          <Link to='/about/articles' className={styles.goBackText}>
            Вернуться в блог
          </Link>
        </div>
        <p className={styles.title}>{article?.title}</p>
        <div className={styles.userWrapper}>
          <MaskedImage src={article?.imageAuthor ?? ''}/>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{article?.author}</p>
            <p className={styles.userRole}>{article?.authorRole}</p>
          </div>
        </div>
      </section>
      <section className={styles.descContainer}>
        <ArticleContent contentJson={article?.content}/>
      </section>
    </>

  );
};

export default LazyComponent;
