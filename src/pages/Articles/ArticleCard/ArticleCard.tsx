import React from 'react';
import { Link } from 'react-router-dom';
import styles from './ArticleCard.module.scss';
import arrow from '@/assets/icons/ArrowToRight.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useDispatch } from 'react-redux';
import { Article, setArticle } from '@/store/slices/articleSlice';

interface ArticleCardProps {
  article: Article;
  reverse?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, reverse }) => {
  const isMobile = useScreenMatch();
  const dispatch = useDispatch();
  const href = `/articles/${article.slug}`;
  const listImageSrc = article.previewImage ?? article.image ?? '';

  const prefetch = () => {
    dispatch(setArticle(article));
  };

  return (
    <article className={`${styles.card} ${reverse ? styles.reverse : ''}`}>
      <Link
        to={href}
        className={`${styles.topWrapper} ${reverse ? styles.reverse : ''}`}
        onClick={prefetch}
      >
        <div className={styles.imageWrapper}>
          {listImageSrc ? (
            <img
              src={listImageSrc}
              alt={article.title}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.date}>{article.date}</span>
            <h2 className={styles.title}>{article.title}</h2>
          </div>
          <p className={styles.desc}>{article.description}</p>
        </div>
      </Link>
      {!isMobile && (
        <Link
          to={href}
          className={styles.readMore}
          onClick={prefetch}
        >
          Читать <img src={arrow} alt="" aria-hidden />
        </Link>
      )}
    </article>
  );
};
