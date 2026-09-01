import React, { useEffect } from 'react';
import styles from '../ArticleDetail.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { Link, useParams, useLocation } from 'react-router-dom';
import back from '@/assets/icons/go-back.svg';
import MaskedImage from '@/components/masked-image/MaskedImage';
import ArticleContent from '@/pages/ArticleDetail/ArticleContent/ArticleContent';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import {
  fetchArticleBySlug,
  fetchInfoPageBySlug,
} from '@/store/slices/articleSlice';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import { useArticleSeo } from '@/pages/ArticleDetail/hooks/useArticleSeo';

const LazyComponent: React.FC = () => {
  const { slug } = useParams();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { article, loading, error } = useSelector((state: RootState) => state.articleSlice);
  const isInfoPage = location.pathname.startsWith('/info/');

  useEffect(() => {
    if (!slug) return;
    if (isInfoPage) {
      void dispatch(fetchInfoPageBySlug(slug));
    } else {
      void dispatch(fetchArticleBySlug(slug));
    }
  }, [slug, dispatch, isInfoPage]);

  useDocumentSeo({
    title: isInfoPage ? article?.title || '' : '',
    description: isInfoPage ? article?.description || undefined : undefined,
    canonicalPath: isInfoPage && article && slug ? `/info/${slug}` : undefined,
    ogType: 'website',
  });

  useArticleSeo({
    title: !isInfoPage ? article?.title || '' : '',
    description: !isInfoPage ? article?.description || undefined : undefined,
    imageUrl: !isInfoPage
      ? article?.image || article?.previewImage || undefined
      : undefined,
    slug: !isInfoPage ? slug || undefined : undefined,
    metaTitle: !isInfoPage ? article?.metaTitle : undefined,
    metaDescription: !isInfoPage ? article?.metaDescription : undefined,
    ogImageUrl: !isInfoPage ? article?.ogImageUrl : undefined,
    canonicalPath: !isInfoPage ? article?.canonicalPath : undefined,
    seoNoIndex: !isInfoPage ? article?.seoNoIndex : undefined,
  });

  const retry = () => {
    if (!slug) return;
    if (isInfoPage) {
      void dispatch(fetchInfoPageBySlug(slug));
    } else {
      void dispatch(fetchArticleBySlug(slug));
    }
  };

  if (loading) {
    return (
      <div className={styles.articleLoading}>
        <SpinnerLoader />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className={styles.articleFeedback} role="alert">
        <p>
          {error
            ? 'Не удалось загрузить материал. Проверьте соединение и попробуйте снова.'
            : 'Страница не найдена.'}
        </p>
        {slug && error ? (
          <button type="button" className={styles.articleRetryBtn} onClick={retry}>
            Повторить
          </button>
        ) : null}
      </div>
    );
  }

  const showAuthor = !isInfoPage && (article.author || article.imageAuthor);
  const backTo = isInfoPage ? '/' : '/articles';
  const backLabel = isInfoPage ? 'На главную' : 'Вернуться в блог';

  return (
    <>
      <section className={styles.titleContainer}>
        <div className={styles.goBackWrapper}>
          <Link to={backTo} className={styles.goBackText}>
            <img className={styles.back} src={back} alt="" aria-hidden />
            {backLabel}
          </Link>
        </div>
        {article.date ? <p className={styles.articleDate}>{article.date}</p> : null}
        <h1 className={styles.title}>{article.title}</h1>
        {showAuthor && (
          <div className={styles.userWrapper}>
            <MaskedImage src={article?.imageAuthor ?? ''} />
            <div className={styles.userInfo}>
              <p className={styles.userName}>{article?.author}</p>
              {article.authorRole ? (
                <p className={styles.userRole}>{article.authorRole}</p>
              ) : null}
            </div>
          </div>
        )}
      </section>
      {!isInfoPage && article?.image ? (
        <section className={styles.articleHeroImage}>
          <img src={article.image} alt="" loading="lazy" decoding="async" />
        </section>
      ) : null}
      <section className={`${styles.descContainer} ${isInfoPage ? styles.descContainerInfo : ''}`}>
        <ArticleContent contentJson={article?.content} variant={isInfoPage ? 'info' : 'default'} />
      </section>
      {!isInfoPage ? (
        <section className={styles.bottomPart}>
          <Bestsellers bleed={32} />
        </section>
      ) : null}
    </>
  );
};

export default LazyComponent;
