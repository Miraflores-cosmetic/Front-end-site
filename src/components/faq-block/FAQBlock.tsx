import React, { useEffect, useState, useRef } from 'react';
import styles from './FAQBlock.module.scss';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
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
        const pageData = await getPageBySlug('vopros-faq');
        
        if (pageData) {
          
          // Извлекаем вопросы и ответы из атрибутов
          const questions: string[] = [];
          const answers: string[] = [];
          const faqImages: string[] = [];

          if (pageData.assignedAttributes && pageData.assignedAttributes.length > 0) {
            // Создаем Map для хранения вопросов и ответов по номерам
            const faqMap = new Map<number, { question?: string; answer?: string; image?: string }>();

            pageData.assignedAttributes.forEach((attr) => {
              const attrSlug = attr.attribute?.slug || '';
              const attrName = attr.attribute?.name || '';
              
              // Определяем номер FAQ (1, 2, 3 и т.д.)
              let faqNumber = 1;
              const numberMatch = attrName.match(/(\d+)/) || attrSlug.match(/(\d+)/);
              if (numberMatch) {
                faqNumber = parseInt(numberMatch[1], 10);
              }
              
              if (!faqMap.has(faqNumber)) {
                faqMap.set(faqNumber, {});
              }
              
              const faqItem = faqMap.get(faqNumber)!;
              
              // Ищем вопросы - ищем "Faq вопрос", "faq-vopros", "question" и т.д.
              if (attrSlug.includes('faq-vopros') || attrSlug.includes('faq-question') ||
                  attrSlug.includes('question') || attrSlug.includes('vopros') ||
                  attrName.toLowerCase().includes('faq вопрос') ||
                  attrName.toLowerCase().includes('вопрос') ||
                  (attrSlug.includes('faq') && attrSlug.includes('question'))) {
                let text = attr.textValue || attr.values?.[0]?.plainText || attr.values?.[0]?.name || '';
                // Если это Editor.js формат
                if (text && typeof text === 'string' && text.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(text);
                    if (parsed && parsed.blocks) {
                      text = editorJsToHtml(parsed);
                    }
                  } catch (e) {
                    // Оставляем как есть
                  }
                }
                if (text) faqItem.question = text;
              }
              
              // Ищем ответы - ищем "Faq ответ", "faq-otvet", "answer" и т.д.
              if (attrSlug.includes('faq-otvet') || attrSlug.includes('faq-answer') ||
                  attrSlug.includes('answer') || attrSlug.includes('otvet') ||
                  attrName.toLowerCase().includes('faq ответ') ||
                  attrName.toLowerCase().includes('ответ') ||
                  (attrSlug.includes('faq') && attrSlug.includes('answer'))) {
                let text = attr.textValue || attr.values?.[0]?.plainText || attr.values?.[0]?.name || '';
                // Если это Editor.js формат
                if (text && typeof text === 'string' && text.startsWith('{')) {
                  try {
                    const parsed = JSON.parse(text);
                    if (parsed && parsed.blocks) {
                      text = editorJsToHtml(parsed);
                    }
                  } catch (e) {
                    // Оставляем как есть
                  }
                }
                if (text) faqItem.answer = text;
              }
              
              // Ищем изображения
              if (attr.fileValue?.url) {
                faqItem.image = attr.fileValue.url;
              }
            });

            // Преобразуем Map в массивы, сортируя по номерам
            const sortedNumbers = Array.from(faqMap.keys()).sort((a, b) => a - b);
            sortedNumbers.forEach((num) => {
              const item = faqMap.get(num)!;
              if (item.question) {
                questions.push(item.question);
                answers.push(item.answer || '');
                if (item.image) {
                  faqImages.push(item.image);
                }
              }
            });
          }

          // Если есть контент страницы, попробуем извлечь FAQ из него
          if (questions.length === 0 && pageData.content) {
            try {
              const parsed = typeof pageData.content === 'string' 
                ? JSON.parse(pageData.content) 
                : pageData.content;
              if (parsed && parsed.blocks) {
                parsed.blocks.forEach((block: any) => {
                  if (block.type === 'paragraph' && block.data?.text) {
                    const text = block.data.text;
                    // Простая эвристика: если текст заканчивается на "?", это вопрос
                    if (text.trim().endsWith('?')) {
                      questions.push(text);
                    } else if (questions.length > 0 && questions.length > answers.length) {
                      // Если есть вопрос без ответа, это может быть ответ
                      answers.push(text);
                    }
                  }
                });
              }
            } catch (e) {
              console.error('Error parsing FAQ content:', e);
            }
          }

          // Формируем FAQ items
          const items = questions.map((question, index) => ({
            question,
            answer: answers[index] || '',
            image: faqImages[index]
          }));

          setFaqItems(items);
          setImages(faqImages);
        } else {
          console.warn('FAQ page not found or has no data');
        }
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
