import React from 'react';
import styles from './BestSellerEtaps.module.scss';
import line from '@/assets/icons/Line-Dots.svg';

export interface BestSellerEtap {
  id: string | number;
  title: string;
  name: string;
  slug?: string;
}

interface EtapsProps {
  items: BestSellerEtap[];
  activeEtap?: string | null;
  onEtapClick?: (etapSlug: string) => void;
}

const BestSellerEtaps: React.FC<EtapsProps> = ({ items, activeEtap, onEtapClick }) => {
  return (
    <div className={styles.etapsWrapper}>
      <div className={styles.etaps} role="tablist" aria-label="Этапы ухода">
        {items.map((item, ind) => {
          const isActive = activeEtap === item.slug || (!activeEtap && ind === 1);
          const canSelect = Boolean(item.slug && onEtapClick);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={!canSelect}
              className={isActive ? styles.etapActive : styles.etap}
              onClick={() => {
                if (item.slug) onEtapClick?.(item.slug);
              }}
            >
              <span className={styles.etapTextWrapper}>
                <span className={styles.etapTitle}>{item.title}</span>
                <span className={styles.etapName}>{item.name}</span>
              </span>
              {ind !== items.length - 1 ? (
                <img src={line} alt="" className={styles.check} aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BestSellerEtaps;
