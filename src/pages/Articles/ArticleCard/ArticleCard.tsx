import React from 'react';
import styles from './ArticleCard.module.scss';
import arrow from '@/assets/icons/ArrowToRight.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useDispatch } from 'react-redux';
import { Article, setArticle } from '@/store/slices/articleSlice';
import { useNavigate } from 'react-router-dom';

interface ArticleCardProps {
  article: Article;
  reverse?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, reverse }) => {
  const isMobile = useScreenMatch();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChooseArticle = () => {
    dispatch(setArticle(article));
    navigate(`/articles/${article.slug}`);
  };

  const listImageSrc = article.previewImage ?? article.image ?? '';

  return (
    <div className={`${styles.card} ${reverse ? styles.reverse : ''}`}>
      <div
        className={`${styles.topWrapper} ${reverse ? styles.reverse : ''}`}
        role="link"
        tabIndex={0}
        onClick={handleChooseArticle}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleChooseArticle();
          }
        }}
      >
        <div className={styles.imageWrapper}>
          {listImageSrc ? (
            <img src={listImageSrc} alt={article.title} />
          ) : null}
        </div>
        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.date}>{article.date}</span>
            <h2 className={styles.title}>{article.title}</h2>
          </div>
          <p className={styles.desc}>{article.description}</p>
        </div>
      </div>
      {!isMobile && (
        <div className={styles.readMore} onClick={handleChooseArticle}>
          Читать <img src={arrow} alt='' />
        </div>
      )}
    </div>
  );
};
