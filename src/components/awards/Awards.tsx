import React, { useEffect, useRef, useState } from 'react';
import styles from './Awards.module.scss';

import awardsVideo from '@/assets/videos/awards.mp4';
import awardsPoster from '@/assets/images/awards-poster.jpg';
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
  const lazyRootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);

  useEffect(() => {
    const section = lazyRootRef.current;
    if (!section || loadVideo) return;

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                setLoadVideo(true);
                io?.disconnect();
              }
            },
            { rootMargin: '200px', threshold: 0.01 },
          )
        : null;
    io?.observe(section);

    return () => io?.disconnect();
  }, [loadVideo]);

  useEffect(() => {
    if (!loadVideo) return;

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

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadVideo, isMobile]);

  const videoProps = {
    ref: videoRef,
    src: loadVideo ? awardsVideo : undefined,
    poster: awardsPoster,
    autoPlay: loadVideo,
    muted: true,
    loop: true,
    playsInline: true,
    preload: loadVideo ? ('metadata' as const) : ('none' as const),
  };

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

      <div ref={lazyRootRef} className={styles.content}>
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
              <video {...videoProps} className={styles.awardImageMobile} />
            </div>
          ) : (
            <video {...videoProps} className={styles.awardVideo} />
          )}
        </div>
      </div>
    </HomeSection>
  );
};
