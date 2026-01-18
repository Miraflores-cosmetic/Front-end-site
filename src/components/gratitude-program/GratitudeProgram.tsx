import React, { useEffect, useState, useRef } from 'react';
import styles from './GratitudeProgram.module.scss';
import gratitudeLine from '@/assets/icons/gratitudeLine.svg';
import { getPageBySlug, PageNode } from '@/graphql/queries/pages.service';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

export const GratitudeProgram: React.FC = () => {
  const [page, setPage] = useState<PageNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const pageData = await getPageBySlug('programma-blagodarnosti');
        if (pageData) {
          setPage(pageData);
        }
      } catch (err: any) {
        console.error('Error fetching gratitude program page:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, []);

  // Intersection Observer для анимации при скролле к секции
  useEffect(() => {
    if (isSectionLoaded) return;

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
  }, [isSectionLoaded]);

  // Извлекаем данные из атрибутов
  const getGiftInfo = (index: number): { text: string; image: string | null } => {
    if (!page?.assignedAttributes) {
      return { text: '', image: null };
    }

    // Ищем атрибут "Информация о подарке - N" (rich-text)
    const giftInfoAttr = page.assignedAttributes.find(
      (attr) => attr.attribute?.slug === `informaciya-o-podarke-${index}` ||
                attr.attribute?.name?.toLowerCase() === `информация о подарке - ${index}`.toLowerCase()
    );
    
    // Ищем атрибут "Фото подарка - N" (file)
    const giftPhotoAttr = page.assignedAttributes.find(
      (attr) => attr.attribute?.slug === `foto-podarka-${index}` ||
                attr.attribute?.name?.toLowerCase() === `фото подарка - ${index}`.toLowerCase()
    );

    // Для rich-text атрибутов нужно обработать Editor.js формат
    let text = '';
    if (giftInfoAttr) {
      if (giftInfoAttr.textValue) {
        text = giftInfoAttr.textValue;
      } else if (giftInfoAttr.values && giftInfoAttr.values.length > 0) {
        const value = giftInfoAttr.values[0];
        if (value.plainText) {
          text = value.plainText;
        } else if (value.name) {
          try {
            const parsed = JSON.parse(value.name);
            if (parsed && parsed.blocks) {
              text = editorJsToHtml(parsed);
            } else {
              text = value.name;
            }
          } catch (e) {
            text = value.name;
          }
        }
      }
    }
    
    const image = giftPhotoAttr?.fileValue?.url || null;

    return { text, image };
  };

  // Извлекаем суммы из атрибутов или используем дефолтные
  const getGiftAmounts = (): string[] => {
    // Можно добавить логику извлечения сумм из атрибутов, если они там есть
    // Пока используем дефолтные значения
    return ['от 5000₽', 'от 10.000₽', 'от 15.000₽', 'от 20.000₽'];
  };

  const giftAmounts = getGiftAmounts();
  const gifts = [1, 2, 3, 4].map(index => getGiftInfo(index));

  // Если данные загружаются, показываем дефолтный контент
  const title = page?.title || 'Программа благодарности';
  const content = page?.content;

  return (
    <section
      ref={sectionRef}
      className={`${styles.gratitudeContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      id="gratitude-program"
    >
      <div className={styles.titleWrapper}>
        <p className={styles.title} id="title">{title}</p>
        {content && (
          <div 
            className={styles.descWrapper}
            dangerouslySetInnerHTML={{ 
              __html: (() => {
                try {
                  const parsed = typeof content === 'string' 
                    ? JSON.parse(content) 
                    : content;
                  if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
                    return editorJsToHtml(parsed);
                  }
                  return typeof content === 'string' ? content : String(content);
                } catch (e) {
                  return typeof content === 'string' ? content : String(content);
                }
              })()
            }}
          />
        )}
        {!content && (
          <div className={styles.descWrapper}>
            <p className={styles.desc}>
            У нас каждый получает подарки!
            Не нужно ничего копить ,  дополнительно регистрироваться, переживать,
            что бонусы сгорят.
            </p>
            {/* <p className={styles.desc}>
              Агрессивное умывание всего за минуту может нарушить защитный барьер и сделать кожу
              уязвимой
            </p> */}
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.gratitudeImageWrapper}>
          <div className={styles.gratitudeWrapper}>
            {giftAmounts.map((amount, index) => (
              <p key={index} className={styles.gratitude}>
                {amount}
              </p>
            ))}
          </div>
          <img src={gratitudeLine} alt='gratitude line' className={styles.gratitudeLine} />
        </div>

        <div className={styles.gratitudeImages}>
          {gifts.map((gift, index) => (
            <div key={index} id={`gift-${index + 1}`} className={styles.imageBlock}>
              {gift.image ? (
                <ImageWithFallback 
                  src={gift.image} 
                  alt={`gift ${index + 1}`} 
                  className={styles.kremImage}
                />
              ) : (
                <div className={styles.placeholderImage} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
