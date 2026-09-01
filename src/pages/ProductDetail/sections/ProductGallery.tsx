import React from 'react';
import HeroSlider, { type HeroMediaItem } from '@/components/HeroSlider/HeroSlider';
import styles from '../ProductDetail.module.scss';

type ProductGalleryProps = {
  media: HeroMediaItem[];
  discount: number | null;
  outOfStock: boolean;
  sliderKey: string;
};

export function ProductGallery({
  media,
  discount,
  outOfStock,
  sliderKey,
}: ProductGalleryProps) {
  return (
    <article className={styles.imagePart}>
      <div className={styles.imageWrapper}>
        {discount && discount > 0 && !outOfStock ? (
          <span className={styles.discount}>-{discount}%</span>
        ) : null}
        <HeroSlider key={sliderKey} media={media} />
      </div>
    </article>
  );
}
