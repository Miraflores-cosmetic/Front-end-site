import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHomePromo } from '@/api/settingsApi';
import { HomeSection } from '@/components/home-section/HomeSection';
import { ProductScrollStrip, ProductScrollStripItem } from '@/components/product-scroll-strip/ProductScrollStrip';
import styles from './HomePromoBanners.module.scss';

export type PromoBannerCard = {
  id: string;
  image: string;
  alt: string;
  href?: string;
  notch?: boolean;
};

export type HomePromoBannersProps = {
  wordLeft?: string;
  wordRight?: string;
  cards?: PromoBannerCard[];
};

const DEFAULT_CARDS: PromoBannerCard[] = [
  {
    id: '1',
    image: '/images/bda89eae9c464482fe2678eb53e58256.jpg',
    alt: 'Уход Miraflores',
    href: '/catalog',
  },
  {
    id: '2',
    image: '/images/4cefad07a8a3c614fe85f1b7279a5c10.jpg',
    alt: 'Сияние кожи',
    href: '/catalog',
  },
  {
    id: '3',
    image: '/images/e6ac7b1b1a5d38a97c129144d6393583.jpg',
    alt: 'Масла и сыворотки',
    href: '/catalog',
  },
  {
    id: '4',
    image: '/images/5d21b6024e52b28a741ee92ccb78e74a.jpg',
    alt: 'Age-defying уход',
    href: '/catalog',
    notch: true,
  },
];

/** Позиции веера от индекса / длины (без жёстких card1…card4). */
function fanStyle(index: number, total: number): React.CSSProperties {
  const t = total <= 1 ? 1 : index / (total - 1);
  const fan = 38 - t * 24;
  const x = -82 + t * 160;
  const z = -100 + t * 170;
  const scale = 0.94 + t * 0.12;
  return {
    ['--fan' as string]: `${fan}deg`,
    ['--x' as string]: `${x}%`,
    ['--z' as string]: `${z}px`,
    ['--scale' as string]: String(scale),
    ['--delay' as string]: `${0.08 + index * 0.08}s`,
    zIndex: index + 1,
  };
}

function MobileCard({ card }: { card: PromoBannerCard }) {
  const img = (
    <img
      src={card.image}
      alt={card.alt}
      className={styles.mobileCardImg}
      loading="lazy"
      decoding="async"
    />
  );
  const className = styles.mobileCard;
  if (card.href) {
    return (
      <Link to={card.href} className={className} aria-label={card.alt}>
        {img}
      </Link>
    );
  }
  return (
    <div className={className} role="img" aria-label={card.alt}>
      {img}
    </div>
  );
}

export function HomePromoBanners({
  wordLeft: wordLeftProp,
  wordRight: wordRightProp,
  cards: cardsProp,
}: HomePromoBannersProps = {}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const activeRef = useRef<number | null>(null);
  const lockUntilRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [wordLeft, setWordLeft] = useState(wordLeftProp ?? 'НАШИ');
  const [wordRight, setWordRight] = useState(wordRightProp ?? 'АКЦИИ');
  const [cards, setCards] = useState<PromoBannerCard[]>(cardsProp ?? DEFAULT_CARDS);
  const [promoFetched, setPromoFetched] = useState(Boolean(cardsProp));

  useEffect(() => {
    if (cardsProp) {
      setCards(cardsProp);
      setPromoFetched(true);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const data = await getHomePromo();
        if (!alive) return;
        setWordLeft(wordLeftProp ?? data.titleLeft);
        setWordRight(wordRightProp ?? data.titleRight);
        if (data.items.length > 0) {
          setCards(
            data.items.map((it) => ({
              id: it.id,
              image: it.imageUrl,
              alt: it.alt || 'Промо',
              href: it.href,
              notch: it.notch,
            })),
          );
        } else {
          setCards([]);
        }
      } catch {
        /* fallback DEFAULT_CARDS */
      } finally {
        if (alive) setPromoFetched(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [cardsProp, wordLeftProp, wordRightProp]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -4% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cards.length]);

  const commitActive = useCallback((next: number | null) => {
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
    if (next != null) {
      lockUntilRef.current = performance.now() + 420;
    }
  }, []);

  function resolveActive(clientX: number, clientY: number) {
    if (performance.now() < lockUntilRef.current && activeRef.current != null) {
      return;
    }
    let best: number | null = null;
    let bestDist = Infinity;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) {
        return;
      }
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (clientX - cx) ** 2 + (clientY - cy) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    commitActive(best);
  }

  function clearActive() {
    lockUntilRef.current = 0;
    commitActive(null);
  }

  if (promoFetched && cards.length === 0) {
    return null;
  }

  const sectionLabel = `${wordLeft} ${wordRight}`.trim();

  return (
    <HomeSection
      aria-label={sectionLabel}
      bleed
      className={[
        styles.section,
        visible ? styles.visible : '',
        active != null ? styles.stackHovered : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        ref={(node) => {
          rootRef.current = node;
        }}
        className={styles.root}
      >
        <div className={styles.stage}>
          <p className={`${styles.word} ${styles.wordLeft}`} aria-hidden>
            {wordLeft}
          </p>

          <div
            className={[styles.stack, active != null ? styles.stackActive : '']
              .filter(Boolean)
              .join(' ')}
            onMouseMove={(e) => resolveActive(e.clientX, e.clientY)}
            onMouseLeave={clearActive}
          >
            {cards.map((card, index) => {
              const isActive = active === index;
              const isPushed = active != null && index > active;
              const pushSteps = isPushed && active != null ? index - active : 0;
              const base = fanStyle(index, cards.length);

              const cardClass = [
                styles.card,
                card.notch ? styles.cardNotch : '',
                isActive ? styles.cardActive : '',
                isPushed ? styles.cardPushed : '',
              ]
                .filter(Boolean)
                .join(' ');

              const style = {
                ...base,
                ...(isActive
                  ? {
                      ['--fan' as string]: '0deg',
                      ['--z' as string]: '240px',
                      ['--scale' as string]: '1.08',
                      ['--push' as string]: '0%',
                    }
                  : {
                      ['--push' as string]: isPushed ? `${pushSteps * 10}%` : '0%',
                    }),
                zIndex: isActive ? 16 : isPushed ? 5 + index : (base.zIndex as number),
              } as React.CSSProperties;

              const body = (
                <img
                  src={card.image}
                  alt=""
                  className={styles.cardImg}
                  loading="lazy"
                  decoding="async"
                />
              );

              return card.href ? (
                <Link
                  key={card.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  to={card.href}
                  className={cardClass}
                  style={style}
                  aria-label={card.alt}
                  onFocus={() => commitActive(index)}
                  onBlur={clearActive}
                >
                  {body}
                </Link>
              ) : (
                <div
                  key={card.id}
                  ref={(node) => {
                    cardRefs.current[index] = node;
                  }}
                  className={cardClass}
                  style={style}
                  role="img"
                  aria-label={card.alt}
                >
                  {body}
                </div>
              );
            })}
          </div>

          <p className={`${styles.word} ${styles.wordRight}`} aria-hidden>
            {wordRight}
          </p>
        </div>

        <div className={styles.mobileStage}>
          <div className={styles.mobileTitleRow}>
            <h2 className={styles.mobileTitle}>
              {wordLeft} {wordRight}
            </h2>
          </div>
          <ProductScrollStrip
            aria-label={sectionLabel}
            size="md"
            itemWidthMobile={300}
            gapMobile={12}
            bleedMobile={16}
            padInlineStartMobile={16}
            peek
            snap
          >
            {cards.map((card) => (
              <ProductScrollStripItem key={card.id}>
                <MobileCard card={card} />
              </ProductScrollStripItem>
            ))}
          </ProductScrollStrip>
        </div>
      </div>
    </HomeSection>
  );
}

export default HomePromoBanners;
