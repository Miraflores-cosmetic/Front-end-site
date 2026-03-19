import React from 'react';
import styles from './TopBlock.module.scss';

const MarqueeText: React.FC = () => (
  <div className={styles.marqueeWrapper}>
    <div className={styles.marqueeLineRightToLeft}>
      <p className={styles.textIcon}>Ботаническая</p>
    </div>
    <div className={styles.marqueeLineLeftToRight}>
      <p className={styles.textIcon}>Косметика</p>
    </div>
  </div>
);

export default MarqueeText;
