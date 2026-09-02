import React, { useEffect, useRef } from 'react';
import styles from './Awards.module.scss';

import awardsVideo from '@/assets/videos/awards.mp4';
import romashkaBig from '@/assets/icons/romashkaBig.svg';
import medal from '@/assets/icons/medal.webp';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';

const AWARD_TEXTS = [
  'Собственное производство гидралатов, экстрактов и купажей',
  'Без искусственных ароматов: только естественные, мягкие ароматы и эфирные масла',
  'Средства поддерживают естественный барьер кожи, не нарушая её липидные структуры',
  'Не тестируем косметику на животных',
  'Используем физиологичные формулы и рецептуры для достижения максимальной эффективности',
  'Используем только научный доказательный подход',
];

export const Awards: React.FC = () => {
  const isMobile = useScreenMatch();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.muted = true;
      void video.play().catch(() => {
        /* autoplay policy — ignore */
      });
    };

    tryPlay();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryPlay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) tryPlay();
            },
            { threshold: 0.15 },
          )
        : null;
    io?.observe(video);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      io?.disconnect();
    };
  }, [isMobile]);

  return (
    <HomeSection className={styles.awardsContainer} aria-labelledby="awards-title">
      <div className={styles.titleWrapper}>
        <SectionTitleRow className={styles.titleRow}>
          <h2 id="awards-title" className={styles.title}>
            Награды за натуральность, эффективность и заботу о коже
          </h2>
        </SectionTitleRow>
        <p className={styles.desc}>15 лет доверия и признания</p>
      </div>

      <div className={styles.content}>
        <div className={styles.leftWrapper}>
          <div className={styles.textWrapper}>
            <ul className={styles.list}>
              {AWARD_TEXTS.map((text, index) => (
                <li key={index}>{text}</li>
              ))}
            </ul>
            <img src={medal} alt="" aria-hidden className={styles.medal} />
          </div>
        </div>

        {!isMobile && (
          <div className={styles.centerWrapper}>
            <img src={romashkaBig} alt="" aria-hidden />
          </div>
        )}

        <div className={styles.rightWrapper}>
          {isMobile ? (
            <div className={styles.bottomImageWrapper}>
              <video
                ref={videoRef}
                src={awardsVideo}
                className={styles.awardImageMobile}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={awardsVideo}
              className={styles.awardVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          )}
        </div>
      </div>
    </HomeSection>
  );
};
