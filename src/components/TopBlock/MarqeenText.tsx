import React from 'react';
import styles from './TopBlock.module.scss';

const MarqueeText: React.FC = () => (
  <div className={styles.marqueeWrapper}>
    <div className={styles.marqueeContent}>
      <p className={styles.textIcon}>Ботаническая</p>
      <p className={styles.textIcon}>Косметика</p>
    </div>
  </div>
);

export default MarqueeText;
