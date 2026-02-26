import React from 'react';
import styles from './Review.module.scss';
import star from '@/assets/icons/star.svg';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

interface ReviewProps {
  images: string[];
  title: string;
  subtitle: string;
  text: string;
  rating: number;
  date: string;
}

export const Review: React.FC<ReviewProps> = ({ images, title, subtitle, text, rating, date }) => {
  return (
    <div className={styles.review}>
      <div className={styles.images}>
        {images && images.length > 0 ? (
          images.map((img, i) => (
            <ImageWithFallback
              key={i}
              src={normalizeMediaUrl(img)}
              alt={title}
              className={styles.reviewImage}
            />
          ))
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden />
        )}
      </div>

      <div className={styles.rating}>
        <div>
          {Array(rating)
            .fill(null)
            .map((_, i) => (
              <img key={i} src={star} alt={`${title} ${i + 1}`} />
            ))}
        </div>
        <p>{rating}.0</p>
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.subtitle}>{subtitle}</p>
        <p className={styles.text}>{text}</p>
        <p className={styles.date}>{date}</p>
      </div>
    </div>
  );
};
