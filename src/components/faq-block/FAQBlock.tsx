import React, { useEffect, useState, useRef } from 'react';
import styles from './FAQBlock.module.scss';
import { getPageBySlug, PageNode, getAllFAQs } from '@/graphql/queries/pages.service';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import faqVideo from '@/assets/videos/faq-video.mp4';

interface FAQItem {
  question: string;
  answer: string;
  image?: string;
}

export const FAQBlock: React.FC = () => {
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchFAQ = async () => {
      try {
        setLoading(true);
        // Загружаем все страницы типа FAQ
        const items = await getAllFAQs();

        // Преобразуем в формат компонента
        const formattedItems: FAQItem[] = items.map(item => ({
          question: item.question,
          answer: item.answer,
          image: item.image
        }));

        // Собираем картинки в отдельный массив (для синхронизации индексов, как было)
        const faqImages = formattedItems.map(item => item.image || '');

        setFaqItems(formattedItems);
        setImages(faqImages);
      } catch (err: any) {
        console.error('Error fetching FAQ:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQ();
  }, []);

  // Intersection Observer для анимации при скролле к секции
  useEffect(() => {
    if (isSectionLoaded) return;
    if (loading) return; // контент с .faqContent появляется только после загрузки

    const setup = () => {
      if (!sectionRef.current) return null;
      const checkVisibility = () => {
        const rect = sectionRef.current!.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      };
      if (checkVisibility()) {
        setIsSectionLoaded(true);
        return null;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) if (e.isIntersecting) setIsSectionLoaded(true);
        },
        { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
      );
      observer.observe(sectionRef.current);
      return () => { sectionRef.current && observer.unobserve(sectionRef.current); };
    };

    let off = setup();
    if (off) return off;
    const id = setTimeout(() => { off = setup(); }, 120);
    return () => { clearTimeout(id); off?.(); };
  }, [isSectionLoaded, loading]);

  const toggleQuestion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Синхронизация высоты leftColumn с rightColumn (но не менее 860px)
  useEffect(() => {
    if (!leftColumnRef.current || !rightColumnRef.current || loading) return;

    const syncHeights = () => {
      if (!leftColumnRef.current || !rightColumnRef.current) return;

      // Получаем реальную высоту rightColumn
      const rightHeight = rightColumnRef.current.getBoundingClientRect().height;
      const minHeight = 860;
      const targetHeight = Math.max(rightHeight, minHeight);

      // Устанавливаем фиксированную высоту для leftColumn
      leftColumnRef.current.style.height = `${targetHeight}px`;
      leftColumnRef.current.style.maxHeight = `${targetHeight}px`;
      leftColumnRef.current.style.minHeight = `${targetHeight}px`;

      // Также устанавливаем высоту для imageWrapper внутри
      const imageWrapper = leftColumnRef.current.querySelector(`.${styles.imageWrapper}`) as HTMLElement;
      if (imageWrapper) {
        imageWrapper.style.height = `${targetHeight}px`;
        imageWrapper.style.maxHeight = `${targetHeight}px`;
      }
    };

    // Небольшая задержка для того, чтобы DOM успел обновиться
    const timeoutId1 = setTimeout(syncHeights, 50);
    const timeoutId2 = setTimeout(syncHeights, 200);
    const timeoutId3 = setTimeout(syncHeights, 500);

    // Синхронизация при изменении размера окна
    window.addEventListener('resize', syncHeights);

    // Используем MutationObserver для отслеживания изменений в rightColumn
    const observer = new MutationObserver(() => {
      setTimeout(syncHeights, 50);
    });
    if (rightColumnRef.current) {
      observer.observe(rightColumnRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
        characterData: true
      });
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      window.removeEventListener('resize', syncHeights);
      observer.disconnect();
    };
  }, [expandedIndex, faqItems.length, loading, isSectionLoaded]);

  if (loading) {
    return (
      <section ref={sectionRef} className={`${styles.faqContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}>
        <SpinnerLoader />
      </section>
    );
  }

  // Показываем FAQ даже если нет данных, но с сообщением
  if (faqItems.length === 0) {
    return (
      <section ref={sectionRef} className={`${styles.faqContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}>
        <div className={styles.faqContent}>
          <p>FAQ данные загружаются...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`${styles.faqContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      id="faq"
    >
      <div className={styles.faqContent}>
        <div ref={leftColumnRef} className={styles.leftColumn}>
          <div className={styles.imageWrapper}>
            <video
              src={faqVideo}
              className={styles.video}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>

        <div ref={rightColumnRef} className={styles.rightColumn}>
          <h2 className={styles.title}>FAQ</h2>
          <div className={styles.faqList}>
            {faqItems.map((item, index) => (
              <div key={index} id={`faq-${index + 1}`} className={styles.faqItem}>
                <button
                  className={styles.question}
                  onClick={() => toggleQuestion(index)}
                >
                  <span className={styles.questionText}>{item.question}</span>
                  <span className={styles.arrow}>
                    {expandedIndex === index ? '↑' : '↓'}
                  </span>
                </button>
                <div
                  className={`${styles.answer} ${expandedIndex === index ? styles.expanded : ''}`}
                  dangerouslySetInnerHTML={{ __html: item.answer }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
