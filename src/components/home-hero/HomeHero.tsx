import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { getHeroSlides, type HeroSlide } from '@/api/settingsApi';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import drop from '@/assets/images/drop.png';
import flower from '@/assets/images/flower.webp';
import flowerSmall from '@/assets/images/flowerSmall.webp';
import lineTo from '@/assets/icons/lineTo.svg';
import { scrollToAnchor } from '@/utils/scrollToAnchor';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import styles from './HomeHero.module.scss';

const SLIDE_MS = 9000;

const CTAS = [
  { label: 'Подобрать уход', href: '/quiz', primary: true },
  { label: 'Программа благодарности', href: '#gratitude-program', primary: false },
  { label: 'Шаг за шагом к чистой коже', href: '#steps-block', primary: false },
] as const;

type SlideView = {
  id: string;
  large: string;
  /** Десктопный thumb / lead */
  thumb: string;
  /** Мобильный кадр (не десктопный large) */
  mobile: string;
};

const FALLBACK_SLIDES: SlideView[] = [
  { id: 'fallback', large: flower, thumb: flowerSmall, mobile: flowerSmall },
];

function toView(slides: HeroSlide[]): SlideView[] {
  if (slides.length === 0) return FALLBACK_SLIDES;
  return slides.map((s) => {
    const large = s.imageUrl || flower;
    const mobile = s.mobileImageUrl || large || flowerSmall;
    return {
      id: s.id,
      large,
      thumb: s.mobileImageUrl || large || flowerSmall,
      mobile,
    };
  });
}

export const HomeHero: React.FC = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  // Статичный flower сразу — без спиннера на first viewport (CLS)
  const isMobile = useScreenMatch();
  const [slides, setSlides] = useState<SlideView[]>(FALLBACK_SLIDES);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const items = await getHeroSlides();
        if (!alive) return;
        setSlides(toView(items));
        setIndex(0);
      } catch {
        if (alive) setSlides(FALLBACK_SLIDES);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reduceMotion) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => window.clearInterval(t);
  }, [slides.length, reduceMotion]);

  const current = slides[index] ?? slides[0] ?? FALLBACK_SLIDES[0];
  /* мобилка — те же кадры, что на десктопе */
  const mainSrc = current.large;

  const onCta = (href: string) => {
    if (href.startsWith('#')) {
      scrollToAnchor(href.slice(1));
      return;
    }
    navigate(href);
  };

  return (
    <section className={styles.hero} data-home-hero aria-label="Главный баннер">
      <div className={styles.inner}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            <span>БОТАНИЧЕСКАЯ</span>
            <span className={styles.titleLine2}>
              К
              <img src={drop} alt="" className={styles.drop} aria-hidden />
              СМЕТИКА
            </span>
          </h1>
          <p className={styles.subtitle}>С меристемными экстрактами</p>
        </div>

        <div className={styles.right}>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              className={styles.media}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              <ImageWithFallback
                className={styles.mainImage}
                src={mainSrc}
                alt="Miraflores"
                loading="eager"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.noteBtn}
            onClick={() => navigate('/quiz')}
            aria-label="Подберем персональный уход за 5 мин — к квизу"
          >
            <span className={styles.note}>
              подберем персональный
              <br />
              уход за 5 мин!
            </span>
          </button>

          {!isMobile ? (
            <div className={styles.lead}>
              <div className={styles.thumbWrap}>
                <ImageWithFallback
                  className={styles.thumb}
                  src={current.thumb}
                  alt=""
                  loading="lazy"
                />
              </div>
            </div>
          ) : null}

          <div className={styles.ctasWrap}>
            <img src={lineTo} alt="" className={styles.arrow} aria-hidden />
            <nav className={styles.ctas} aria-label="Быстрые ссылки">
              {CTAS.map((cta) => (
                <button
                  key={cta.label}
                  type="button"
                  className={cta.primary ? styles.ctaPrimary : styles.ctaMuted}
                  onClick={() => onCta(cta.href)}
                >
                  {cta.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};
