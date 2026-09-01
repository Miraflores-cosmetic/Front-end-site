import React from 'react';
import { Link } from 'react-router-dom';
import styles from '../ProductDetail.module.scss';

export function ProductNotFound() {
  return (
    <section className={styles.productNotFound} aria-labelledby="product-not-found-title">
      <h1 id="product-not-found-title" className={styles.productNotFoundTitle}>
        Товар не найден
      </h1>
      <p className={styles.productNotFoundText}>
        Возможно, ссылка устарела или товар снят с публикации.
      </p>
      <div className={styles.productNotFoundActions}>
        <Link to="/catalog" className={styles.productNotFoundPrimary}>
          В каталог
        </Link>
        <Link to="/" className={styles.productNotFoundSecondary}>
          На главную
        </Link>
      </div>
    </section>
  );
}
