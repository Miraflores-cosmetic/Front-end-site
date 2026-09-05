import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Review.module.scss';
import greenStar from '@/assets/icons/green-star.svg';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export type ReviewCardKind = 'text' | 'image' | 'video';

export type ReviewCardProps = {
  kind: ReviewCardKind;
  mediaUrl?: string | null;
  title: string;
  subtitle?: string;
  text: string;
  rating: number;
  date: string;
  productSlug?: string;
  productThumb?: string | null;
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

/** image1/2 → media card; video extension → reel; иначе текст. */
export function resolveReviewKind(
  mediaUrls: Array<string | null | undefined>,
): { kind: ReviewCardKind; mediaUrl: string | null } {
  const first = mediaUrls.map((u) => u?.trim() || '').find(Boolean) || null;
  if (!first) return { kind: 'text', mediaUrl: null };
  if (isVideoUrl(first)) return { kind: 'video', mediaUrl: first };
  return { kind: 'image', mediaUrl: first };
}

export const Review: React.FC<ReviewCardProps> = ({
  kind,
  mediaUrl,
  title,
  subtitle,
  text,
  rating,
  date,
  productSlug,
  productThumb,
}) => {
  const stars = Math.max(0, Math.min(5, Math.round(rating)));
  const ratingLabel = Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
  const mediaSrc = mediaUrl ? normalizeMediaUrl(mediaUrl) : null;
  const thumbSrc = productThumb ? normalizeMediaUrl(productThumb) : null;

  if (kind === 'video' && mediaSrc) {
    return (
      <article className={`${styles.card} ${styles.mediaCard}`} aria-label="Видео-отзыв">
        <video
          className={styles.media}
          src={mediaSrc}
          muted
          playsInline
          loop
          autoPlay
          preload="metadata"
        />
      </article>
    );
  }

  if (kind === 'image' && mediaSrc) {
    return (
      <article className={`${styles.card} ${styles.mediaCard}`} aria-label="Фото-отзыв">
        <ImageWithFallback src={mediaSrc} alt="" className={styles.media} />
      </article>
    );
  }

  const productBlock = (
    <>
      <div className={styles.productThumb}>
        {thumbSrc ? (
          <ImageWithFallback src={thumbSrc} alt="" className={styles.productImg} />
        ) : (
          <span className={styles.productPh} aria-hidden />
        )}
      </div>
      <div className={styles.productText}>
        <p className={styles.productName}>{title}</p>
        {subtitle ? <p className={styles.productSub}>{subtitle}</p> : null}
      </div>
    </>
  );

  return (
    <article className={`${styles.card} ${styles.textCard}`}>
      <header className={styles.meta}>
        <div className={styles.rating} aria-label={`Оценка ${ratingLabel} из 5`}>
          <span className={styles.stars} aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <img
                key={i}
                src={greenStar}
                alt=""
                className={i < stars ? styles.starOn : styles.starOff}
              />
            ))}
          </span>
          <span className={styles.ratingValue}>{ratingLabel}</span>
        </div>
        {date ? <time className={styles.date}>{date}</time> : null}
      </header>

      <div className={styles.bodyWrap}>
        <p className={styles.body}>{text}</p>
      </div>

      {productSlug ? (
        <Link to={`/product/${encodeURIComponent(productSlug)}`} className={styles.product}>
          {productBlock}
        </Link>
      ) : (
        <div className={styles.product}>{productBlock}</div>
      )}
    </article>
  );
};
