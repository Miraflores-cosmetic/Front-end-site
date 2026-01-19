import React, { useEffect, useState, useRef } from 'react';
import styles from './Awards.module.scss';

import awardsVideo from '@/assets/videos/awards.mp4';
import leaf from '@/assets/images/leaf.webp';
import romashkaBig from '@/assets/icons/romashkaBig.svg';
import medal from '@/assets/icons/medal.webp';

import { useScreenMatch } from '@/hooks/useScreenMatch';

const AWARD_TEXTS = [
  'Собственное производство гидралатов, экстрактов и купажей',
  'Без искусственных ароматов: только естественные, мягкие ароматы и эфирные масла',
  'Средства поддерживают естественный барьер кожи, не нарушая её липидные структуры',
  'Не тестируем косметику на животных',
  'Используем физиологичные формулы и рецептуры для достижения максимальной эффективности',
  'Используем только научный доказательный подход'
];

export const Awards: React.FC = () => {
  const isMobile = useScreenMatch(800);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section
      ref={sectionRef}
      className={`${styles.awardsContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
    >
      {/* Заголовок */}
      <div className={styles.titleWrapper}>
        <p className={styles.title}>Награды за натуральность, эффективность и заботу о коже</p>
        <p className={styles.desc}>15 лет доверия и признания</p>
      </div>

      {/* Контент */}
      <div className={styles.content}>
        {/* Левая колонка */}
        <div className={styles.leftWrapper}>
          <div className={styles.textWrapper}>
            <ul className={styles.list}>
              {AWARD_TEXTS.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
            <img src={medal} alt='Медаль за качество' className={styles.medal} />
          </div>
        </div>

        {/* Центр (только для desktop) */}
        {!isMobile && (
          <div className={styles.centerWrapper}>
            <img src={romashkaBig} alt='Ромашка' />
          </div>
        )}

        {/* Правая колонка */}
        <div className={styles.rightWrapper}>
          {isMobile ? (
            <div className={styles.bottomImageWrapper}>
              <video
                src={awardsVideo}
                className={styles.awardImageMobile}
                autoPlay
                muted
                loop
                playsInline
              />
              <img src={leaf} className={styles.leaf} alt='Листок' />
            </div>
          ) : (
            <video
              src={awardsVideo}
              className={styles.awardVideo}
              autoPlay
              muted
              loop
              playsInline
            />
          )}
        </div>
      </div>
    </section>
  );
};
