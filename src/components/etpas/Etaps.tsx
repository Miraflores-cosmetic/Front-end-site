import React from 'react';
import styles from './Etaps.module.scss';

export interface Etap {
  id: string | number;
  title: string;
  name: string;
  icon: string;
}

interface EtapsProps {
  items: Etap[];
}

const Etaps: React.FC<EtapsProps> = ({ items }) => {
  return (
    <div className={styles.etapsWrapper}>
      <div className={`${styles.etaps} ${items.length < 3 ? styles.etapsLeft : ''}`}>
        {items.map(item => (
          <div key={item.id} className={styles.etap}>
            <img src={item.icon} alt='check icon' className={styles.check} />
            <div className={styles.etapTextWrapper}>
              <p className={styles.etapTitle}>{item.title}</p>
              <p className={styles.etapName}>{item.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Etaps;
