import React from 'react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import styles from './MenuShowcaseCard.module.scss';

export type MenuShowcaseProduct = {
  title: string;
  slug: string;
  price: number;
  oldPrice?: number;
  description?: string;
  imageUrl: string;
};

type MenuShowcaseCardProps = {
  product: MenuShowcaseProduct;
  onNavigate?: () => void;
};

/** Лёгкая витринная карточка меню: фото, название, цена — без вариантов/корзины/избранного. */
export function MenuShowcaseCard({ product, onNavigate }: MenuShowcaseCardProps) {
  const price = Math.round(product.price).toLocaleString('ru-RU');
  const oldPrice = product.oldPrice
    ? Math.round(product.oldPrice).toLocaleString('ru-RU')
    : null;
  const href = `/product/${product.slug}`;

  return (
    <article className={styles.card}>
      <Link
        to={href}
        className={styles.media}
        onClick={onNavigate}
        aria-label={product.title}
      >
        <ImageWithFallback
          src={product.imageUrl}
          alt=""
          className={styles.image}
        />
      </Link>
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <Link to={href} className={styles.title} onClick={onNavigate}>
            {product.title}
          </Link>
          <div className={styles.priceWrap}>
            {oldPrice ? <span className={styles.oldPrice}>{oldPrice} ₽</span> : null}
            <span className={styles.price}>{price} ₽</span>
          </div>
        </div>
        {product.description ? (
          <p className={styles.desc}>{product.description}</p>
        ) : null}
      </div>
    </article>
  );
}

export function MenuShowcaseSkeleton() {
  return (
    <div className={styles.card} aria-hidden>
      <div className={`${styles.media} ${styles.skeletonShimmer}`} />
      <div className={styles.info}>
        <div className={styles.skeletonLine} />
        <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
      </div>
    </div>
  );
}
