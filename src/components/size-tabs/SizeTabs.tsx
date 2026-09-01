'use client';

import React from 'react';
import styles from './SizeTabs.module.scss';
import { ProductVariant } from '@/types/productSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { setActiveVariantId } from '@/store/slices/productSlice';
import { isVariantOutOfStock } from '@/utils/stock';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import { useToast } from '@/components/toast/toast';
import { useSlidingTabIndicator } from '@/hooks/useSlidingTabIndicator';

interface ProductTabsProps {
  options: ProductVariant[];
  activeVariantId: string | null;
}

/** Только выбор объёма; цена рендерится рядом с ATC в BuyBox. */
const SizeTabs: React.FC<ProductTabsProps> = ({ options, activeVariantId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const { wrapRef, setBtnRef, setHoverKey, onWrapperMouseLeave } =
    useSlidingTabIndicator(activeVariantId);

  if (activeVariantId === null) return null;

  return (
    <div className={styles.wrapper}>
      <div
        ref={wrapRef}
        className={styles.tabs}
        role="tablist"
        aria-label="Объём"
        onMouseLeave={onWrapperMouseLeave}
      >
        <span className={styles.tabsIndicator} aria-hidden />
        {options.map((opt) => {
          const volume = getVolumeFromVariant(opt);
          const isActive = opt.node.id === activeVariantId;
          const oos = isVariantOutOfStock({
            trackInventory: opt.node.trackInventory,
            quantityAvailable: opt.node.quantityAvailable,
          });
          return (
            <button
              key={opt.node.id}
              ref={setBtnRef(opt.node.id)}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={oos || undefined}
              aria-label={oos ? `${volume}, нет в наличии` : volume}
              className={[
                styles.tab,
                isActive ? styles.active : '',
                oos ? styles.tabOutOfStock : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onMouseEnter={() => setHoverKey(opt.node.id)}
              onClick={() => {
                if (oos) {
                  toast.error('Нет в наличии');
                  return;
                }
                dispatch(setActiveVariantId(opt.node.id));
              }}
            >
              <span className={styles.tabVolume}>{volume}</span>
              {oos ? <span className={styles.tabOosHint}>нет</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SizeTabs;
