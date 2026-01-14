import React from 'react';
import styles from './TopBlock.module.scss';
import drop from '@/assets/images/drop.svg';

const DesktopTextImages: React.FC = () => (
  <div className={styles.imageWrapper}>
    <h1 className={styles.heroTitle}>
      <span>БОТАНИЧЕСКАЯ</span>
      <span className={styles.secondLine}>
        К
        <img src={drop} alt='' className={styles.dropIcon} />
        СМЕТИКА
      </span>
    </h1>
    <p className={styles.meristemText}>С меристемными экстрактами</p>
  </div>
);

export default DesktopTextImages;
