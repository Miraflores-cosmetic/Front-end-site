import React from 'react';
import styles from './BestSellerEtaps.module.scss';
import line from '@/assets/icons/Line-Dots.svg';

export interface BestSellerEtap {
  id: string | number;
  title: string;
  name: string;
  slug?: string; // slug этапа для фильтрации
}

interface EtapsProps {
  items: BestSellerEtap[];
  activeEtap?: string | null; // slug активного этапа
  onEtapClick?: (etapSlug: string) => void; // обработчик клика на этап
}

const BestSellerEtaps: React.FC<EtapsProps> = ({ items, activeEtap, onEtapClick }) => {
  return (
    <div className={styles.etapsWrapper}>
      <div className={styles.etaps}>
        {items.map((item, ind) => {
          const isActive = activeEtap === item.slug || (!activeEtap && ind === 1);
          return (
            <div
              key={item.id}
              className={isActive ? styles.etapActive : styles.etap}
              onClick={() => item.slug && onEtapClick?.(item.slug)}
            >
              <div className={styles.etapTextWrapper}>
                <p className={styles.etapTitle}>{item.title}</p>
                <p className={styles.etapName}>{item.name}</p>
              </div>
              {ind !== items.length - 1 && (
                <img src={line} alt='line icon' className={styles.check} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BestSellerEtaps;
