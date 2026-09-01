import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './GratitudeProgram.module.scss';
import gratitudeLine from '@/assets/icons/gratitudeLine.svg';
import { Link } from 'react-router-dom';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import {
  getGratitudeProgram,
  type GratitudeTierPublic,
} from '@/api/settingsApi';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import { HomeSection } from '@/components/home-section/HomeSection';
import { useScreenMatch } from '@/hooks/useScreenMatch';

const FALLBACK_INTRO =
  'У нас каждый получает подарки! Не нужно ничего копить, дополнительно регистрироваться, переживать, что бонусы сгорят.';

function articleHref(slug: string | null): string {
  const s = slug?.trim();
  if (!s) return '/articles/programma-blagodarnosti-2';
  if (s.startsWith('/')) return s;
  return `/articles/${encodeURIComponent(s)}`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** «от 5 000₽» → от + сумма для типографики */
function PriceLabel({ text }: { text: string }) {
  const m = text.trim().match(/^(от)\s*(.+)$/i);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className={styles.priceFrom}>{m[1]}</span>
      {' '}
      <span className={styles.priceSum}>{m[2]}</span>
    </>
  );
}

function GratitudeSkeleton() {
  return (
    <div className={styles.content} aria-hidden>
      <div className={styles.desktopLayout}>
        <div className={styles.gratitudeImages}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonCircle} />
          ))}
        </div>
      </div>
      <div className={styles.mobileTrack}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.mobileSlide}>
            <div className={styles.skeletonCircle} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const GratitudeProgram: React.FC = () => {
  const isMobile = useScreenMatch();
  const [tiers, setTiers] = useState<GratitudeTierPublic[]>([]);
  const [articleSlug, setArticleSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileIndex, setMobileIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getGratitudeProgram();
        if (cancelled) return;
        setTiers(data.tiers ?? []);
        setArticleSlug(data.articleSlug);
      } catch (err) {
        console.error('[GratitudeProgram] settings/gratitude failed', err);
        if (!cancelled) {
          setTiers([]);
          setArticleSlug(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const moreTo = useMemo(() => articleHref(articleSlug), [articleSlug]);

  const syncMobileScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const slides = el.querySelectorAll<HTMLElement>('[data-gratitude-slide]');
    if (!slides.length) return;
    const mid = el.scrollLeft + el.clientWidth * 0.35;
    let best = 0;
    let bestDist = Infinity;
    slides.forEach((slide, i) => {
      const dist = Math.abs(slide.offsetLeft - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setMobileIndex(best);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || loading || !isMobile) return;
    syncMobileScroll();
    el.addEventListener('scroll', syncMobileScroll, { passive: true });
    window.addEventListener('resize', syncMobileScroll);
    return () => {
      el.removeEventListener('scroll', syncMobileScroll);
      window.removeEventListener('resize', syncMobileScroll);
    };
  }, [loading, isMobile, tiers.length, syncMobileScroll]);

  const scrollToSlide = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.querySelectorAll<HTMLElement>('[data-gratitude-slide]')[index];
    if (!slide) return;
    el.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
  };

  if (!loading && tiers.length === 0) return null;

  return (
    <HomeSection
      className={styles.gratitudeContainer}
      id="gratitude-program"
      anchor
      aria-labelledby="title"
    >
      <div className={styles.titleWrapper}>
        {isMobile ? (
          <>
            <h2 className={styles.title} id="title">
              Программа благодарности
            </h2>
            <MoreLink to={moreTo} className={styles.moreBelow}>
              подробнее
            </MoreLink>
          </>
        ) : (
          <SectionTitleRow className={styles.titleRow}>
            <h2 className={styles.title} id="title">
              Программа благодарности
            </h2>
            <MoreLink to={moreTo}>подробнее</MoreLink>
          </SectionTitleRow>
        )}
        <div className={styles.descWrapper}>
          <p className={styles.desc}>{FALLBACK_INTRO}</p>
        </div>
      </div>

      {loading ? (
        <GratitudeSkeleton />
      ) : (
        <div className={styles.content}>
          <div className={styles.desktopLayout}>
            <div className={styles.gratitudeImageWrapper}>
              <div className={styles.gratitudeWrapper}>
                {tiers.map((tier) => (
                  <p key={tier.id} className={styles.gratitude}>
                    <PriceLabel text={tier.title} />
                  </p>
                ))}
              </div>
              <img
                src={gratitudeLine}
                alt=""
                className={styles.gratitudeLine}
                aria-hidden
              />
            </div>

            <div className={styles.gratitudeImages}>
              {tiers.map((tier, index) => {
                const label =
                  stripHtml(tier.infoHtml) || tier.title || `Подарок ${index + 1}`;
                return (
                  <div
                    key={tier.id}
                    id={`gift-${index + 1}`}
                    className={styles.imageBlock}
                  >
                    <Link to={moreTo} className={styles.imageLink} aria-label={label}>
                      {tier.imageUrl ? (
                        <ImageWithFallback
                          src={normalizeMediaUrl(tier.imageUrl)}
                          alt={label}
                          className={styles.kremImage}
                        />
                      ) : (
                        <div className={styles.placeholderImage} aria-hidden />
                      )}
                      <span className={styles.circleCaption} aria-hidden>
                        <span className={styles.circleCaptionText}>{label}</span>
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            ref={trackRef}
            className={styles.mobileTrack}
            aria-label="Уровни программы благодарности"
          >
            {tiers.map((tier, index) => {
              const label =
                stripHtml(tier.infoHtml) || tier.title || `Подарок ${index + 1}`;
              return (
                <div
                  key={tier.id}
                  id={`gift-mobile-${index + 1}`}
                  className={styles.mobileSlide}
                  data-gratitude-slide
                >
                  <p className={styles.gratitude}>
                    <PriceLabel text={tier.title} />
                  </p>
                  <div className={styles.imageBlock}>
                    <Link to={moreTo} className={styles.imageLink} aria-label={label}>
                      {tier.imageUrl ? (
                        <ImageWithFallback
                          src={normalizeMediaUrl(tier.imageUrl)}
                          alt={label}
                          className={styles.kremImage}
                        />
                      ) : (
                        <div className={styles.placeholderImage} aria-hidden />
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.mobileChrome}>
            <div
              className={styles.dots}
              role="tablist"
              aria-label="Уровни благодарности"
            >
              {tiers.map((tier, index) => (
                <button
                  key={tier.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileIndex === index}
                  aria-label={`Уровень ${index + 1}`}
                  className={mobileIndex === index ? styles.dotActive : styles.dot}
                  onClick={() => scrollToSlide(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </HomeSection>
  );
};
