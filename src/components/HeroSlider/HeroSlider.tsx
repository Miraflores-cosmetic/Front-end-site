import React, { useCallback, useEffect, useRef, useState } from 'react';
import Slider from 'react-slick';
import type { CustomArrowProps, Settings } from 'react-slick';
import styles from './HeroSlider.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

export type HeroMediaItem = {
  url: string;
  alt: string;
  id?: string;
  mediaType?: 'image' | 'video' | string | null;
};

interface HeroSliderProps {
  media: HeroMediaItem[];
}

function isVideo(item: HeroMediaItem): boolean {
  const t = (item.mediaType || '').toLowerCase();
  if (t === 'video') return true;
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(item.url);
}

function NavArrow({
  direction,
  onClick,
  className,
}: {
  direction: 'prev' | 'next';
  onClick?: CustomArrowProps['onClick'];
  className?: string;
}) {
  const disabled = className?.includes('slick-disabled');
  return (
    <button
      type="button"
      className={[
        styles.navArrow,
        direction === 'prev' ? styles.navPrev : styles.navNext,
        disabled ? styles.navDisabled : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Предыдущее фото' : 'Следующее фото'}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        {direction === 'prev' ? (
          <path
            d="M12.5 4.5 7 10l5.5 5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}

async function requestMediaFullscreen(el: HTMLVideoElement) {
  const anyEl = el as HTMLVideoElement & {
    webkitEnterFullscreen?: () => void;
    webkitRequestFullscreen?: () => Promise<void>;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return;
    }
    if (anyEl.webkitEnterFullscreen) {
      anyEl.webkitEnterFullscreen();
      return;
    }
    if (anyEl.webkitRequestFullscreen) {
      await anyEl.webkitRequestFullscreen();
    }
  } catch {
    /* ignore — браузер/жест мог отклонить */
  }
}

const HeroSlider: React.FC<HeroSliderProps> = ({ media }) => {
  const isMobile = useScreenMatch();
  const sliderRef = useRef<Slider | null>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [active, setActive] = useState(0);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

  const items = media?.length ? media : [];
  const mediaKey = items.map((m) => m.url).join('|');

  useEffect(() => {
    setActive(0);
    sliderRef.current?.slickGoTo(0, true);
  }, [mediaKey]);

  const goTo = useCallback((index: number) => {
    setActive(index);
    sliderRef.current?.slickGoTo(index);
  }, []);

  const openImageZoom = useCallback((url: string) => {
    setZoomUrl(url);
  }, []);

  const settings: Settings = {
    dots: false,
    arrows: !isMobile && items.length > 1,
    infinite: false,
    speed: 400,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: !isMobile,
    adaptiveHeight: false,
    swipe: true,
    touchMove: true,
    draggable: true,
    prevArrow: <NavArrow direction="prev" />,
    nextArrow: <NavArrow direction="next" />,
    beforeChange: (_curr, next) => setActive(next),
  };

  if (!items.length) return null;

  return (
    <div className={styles.heroSlider}>
      <div className={styles.mediaStage}>
        <Slider ref={sliderRef} {...settings}>
          {items.map((src, index) => (
            <div key={src.id || `${src.url}-${index}`} className={styles.slide}>
              {isVideo(src) ? (
                <div className={styles.videoWrap}>
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    className={styles.media}
                    src={src.url}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={src.alt}
                  />
                  <button
                    type="button"
                    className={styles.videoFullscreen}
                    aria-label="На весь экран"
                    onClick={() => {
                      const el = videoRefs.current[index];
                      if (el) void requestMediaFullscreen(el);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                      <path
                        d="M3 7V3h4M11 3h4v4M15 11v4h-4M7 15H3v-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.zoomTrigger}
                  onClick={() => openImageZoom(src.url)}
                  aria-label={`${src.alt}, увеличить`}
                >
                  <img className={styles.media} src={src.url} alt={src.alt} />
                </button>
              )}
            </div>
          ))}
        </Slider>

        {items.length > 1 ? (
          <div className={styles.thumbs} role="tablist" aria-label="Галерея">
            {items.map((src, index) => (
              <button
                key={`thumb-${src.id || index}`}
                type="button"
                role="tab"
                aria-selected={active === index}
                aria-label={
                  isVideo(src) ? `Видео ${index + 1}` : `Фото ${index + 1}`
                }
                className={[
                  styles.thumb,
                  active === index ? styles.thumbActive : '',
                  isVideo(src) ? styles.thumbVideo : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => goTo(index)}
              >
                {isVideo(src) ? (
                  <span className={styles.thumbVideoBadge} aria-hidden>
                    ▶
                  </span>
                ) : null}
                {isVideo(src) ? (
                  <video
                    src={src.url}
                    muted
                    preload="metadata"
                    className={styles.thumbMedia}
                  />
                ) : (
                  <img src={src.url} alt="" className={styles.thumbMedia} />
                )}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {zoomUrl ? (
        <div
          className={styles.zoomOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Увеличенное изображение"
          onClick={() => setZoomUrl(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setZoomUrl(null);
          }}
        >
          <button
            type="button"
            className={styles.zoomClose}
            aria-label="Закрыть"
            onClick={() => setZoomUrl(null)}
          >
            ×
          </button>
          <img src={zoomUrl} alt="" className={styles.zoomImage} />
        </div>
      ) : null}
    </div>
  );
};

export default HeroSlider;
