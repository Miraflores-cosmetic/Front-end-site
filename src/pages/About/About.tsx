import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './About.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { editorJsToHtml } from '@/utils/editorJsParser';

const About: React.FC = () => {
  const [page, setPage] = useState<PageNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { slug } = useParams<{ slug?: string }>();

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        setError(null);
        // Используем slug из URL или 'about' по умолчанию
        const pageSlug = slug || 'about';
        const pageData = await getPageBySlug(pageSlug);
         
        if (!pageData) {
          setError('Страница не найдена');
          return;
        }

        // Проверяем, что это не статья
        if (pageData.pageType?.name === 'Cтатьи' || pageData.pageType?.name === 'Статьи') {
          setError('Эта страница является статьей');
          return;
        }

        setPage(pageData);
      } catch (err: any) {
        console.error('Error fetching page:', err);
        setError(err?.message || 'Ошибка при загрузке страницы');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  return (
    <article className={styles.aboutContainer}>
      <Header />
      {loading && <SpinnerLoader />}
      {error && (
        <section className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
        </section>
      )}
      {!loading && !error && page && (
        <section className={styles.contentContainer}>
          <div className={styles.contentWrapper}>
            <h1 className={styles.title}>{page.title}</h1>
            {page.content ? (
              <div 
                className={styles.content}
                dangerouslySetInnerHTML={{ 
                  __html: (() => {
                    try {
                      // Пытаемся распарсить как JSON (Editor.js формат)
                      const parsed = typeof page.content === 'string' 
                        ? JSON.parse(page.content) 
                        : page.content;
                      // Если это объект с полями blocks, значит это Editor.js
                      if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                        return editorJsToHtml(parsed);
                      }
                      // Иначе возвращаем как есть (уже HTML) - не экранируем, так как это уже HTML
                      return typeof page.content === 'string' ? page.content : String(page.content);
                    } catch (e) {
                      // Если не JSON, значит это уже HTML - возвращаем как есть
                      return typeof page.content === 'string' ? page.content : String(page.content);
                    }
                  })()
                }}
              />
            ) : (
              <p className={styles.noContent}>Контент страницы пока не добавлен.</p>
            )}
          </div>
        </section>
      )}
      <Footer footerImage={footerImage} />
    </article>
  );
};

export default About;
