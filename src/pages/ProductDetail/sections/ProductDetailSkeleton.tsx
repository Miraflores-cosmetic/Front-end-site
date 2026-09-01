import React from 'react';
import styles from '../ProductDetail.module.scss';

/** Скелет PDP: mobile = title → media → buy; desktop = media | info. */
export function ProductDetailSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Загрузка товара">
      <div className={styles.skeletonBreadcrumbs}>
        <span className={styles.skeletonLine} />
      </div>
      <div className={styles.skeletonMain}>
        <span className={styles.skeletonTitleMobile} />
        <div className={styles.skeletonMedia} />
        <div className={styles.skeletonInfo}>
          <span className={styles.skeletonTitle} />
          <span className={styles.skeletonLineShort} />
          <span className={styles.skeletonPrice} />
          <span className={styles.skeletonTabs} />
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLineShort} />
          <span className={styles.skeletonCta} />
        </div>
      </div>
    </div>
  );
}
