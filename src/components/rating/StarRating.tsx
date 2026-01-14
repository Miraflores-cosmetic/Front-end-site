import React from 'react';
import starIcon from '@/assets/icons/green-star.svg';
import styles from './StarRating.module.scss';

interface StarRatingProps {
  rating: number;
  max?: number;
  text?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, max = 5, text }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={styles.wrapper}>
      <div>
        {Array.from({ length: max }).map((_, i) => {
          const isFull = i < fullStars;
          const isHalf = hasHalf && i === fullStars;

          let className = styles.star;
          if (isFull) className = `${styles.star} ${styles.full}`;
          else if (isHalf) className = `${styles.star} ${styles.half}`;

          return <img key={i} src={starIcon} alt='star' className={className} />;
        })}
      </div>
      {text && <p>{text}</p>}
    </div>
  );
};

export default StarRating;
