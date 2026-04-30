// BestSellerTabs.tsx
import React, { useEffect, useState } from 'react';
import styles from './BestSellerTabs.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

type Option = {
  id: string;
  label: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  Content: React.FC;
};

interface ProductTabsProps {
  options: Option[];
}

const BestSellerTabs: React.FC<ProductTabsProps> = ({ options }) => {
  const list = options?.length ? options : [];
  const [activeId, setActiveId] = useState<string>(() => list[0]?.id ?? '');
  const isMobile = useScreenMatch();

  const optionIdsKey = list.map(o => o.id).join(',');

  useEffect(() => {
    if (list.length === 0) return;
    if (!list.some(o => o.id === activeId)) {
      setActiveId(list[0].id);
    }
  }, [optionIdsKey, activeId, list]);

  const activeOption = list.find(o => o.id === activeId);

  if (list.length === 0 || !activeOption) {
    return null;
  }

  const ActiveContent = activeOption.Content;

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs} data-mobile={isMobile ? 'true' : 'false'}>
        {list.map(opt => (
          <button
            key={opt.id}
            className={`${styles.tab} ${opt.id === activeId ? styles.active : ''}`}
            type="button"
            onClick={e => {
              setActiveId(opt.id);
              e.currentTarget.scrollIntoView({
                block: 'nearest',
                inline: 'nearest',
                behavior: 'smooth'
              });
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={styles.info}>
        <div className={styles.activeContent}>
          <ActiveContent />
        </div>
      </div>
    </div>
  );
};

export default BestSellerTabs;
