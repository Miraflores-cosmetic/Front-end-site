'use client';

import React from 'react';
import styles from './SizeTabs.module.scss';
import { ProductVariant } from '@/types/productSlice';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';

import { setActiveVariantId } from '@/store/slices/productSlice';

interface ProductTabsProps {
  options: ProductVariant[];
  activeVariantId: string | null;
}

const SizeTabs: React.FC<ProductTabsProps> = ({ options, activeVariantId }) => {
  const activeOption = options.find(o => o.node.id === activeVariantId);
  const dispatch = useDispatch<AppDispatch>();

  const getVolumeFromVariant = (variant: ProductVariant): string => {
    if (!variant?.node?.attributes || !Array.isArray(variant.node.attributes)) {
      return variant?.node?.name || '';
    }
    
    const volumeAttr = variant.node.attributes.find((attr: any) => {
      const slug = attr.attribute?.slug?.toLowerCase() || '';
      const name = attr.attribute?.name?.toLowerCase() || '';
      return slug === 'obem' || 
             slug === 'volume' ||
             name.includes('объем') ||
             name.includes('volume');
    });
    
    if (volumeAttr) {
      const value = volumeAttr.values?.[0];
      if (value?.name) {
        return value.name;
      } else if (value?.plainText) {
        return value.plainText;
      } else if (value?.slug) {
        return value.slug;
      }
    }
    
    return variant?.node?.name || '';
  };

  const setActiveId = (id: string) => {
    dispatch(setActiveVariantId(id));
  };

  const formatPrice = (amount: number) =>
    Math.round(amount).toLocaleString('ru-RU');

  if (activeVariantId === null) return null;
  if (activeVariantId !== null)
    return (
      <div className={styles.wrapper}>
        <div className={styles.tabs}>
          {options.map(opt => {
            const volume = getVolumeFromVariant(opt);
            return (
              <button
                key={opt.node.id}
                className={`${styles.tab} ${opt.node.id === activeVariantId ? styles.active : ''}`}
                onClick={() => setActiveId(opt.node.id)}
              >
                {volume}
              </button>
            );
          })}
        </div>

        <div className={styles.info}>
          <span className={styles.price}>{formatPrice(activeOption?.node.pricing.price.gross.amount ?? 0)}₽</span>
          {activeOption?.node.pricing.discount && (
            <span className={styles.oldPrice}>
              {formatPrice(activeOption.node.pricing.priceUndiscounted.gross.amount)}₽
            </span>
          )}
          {/* {getDiscountPercentage(activeOption) && (
          <span className={styles.discount}>-{getDiscountPercentage(activeOption)}%</span>
        )} */}
        </div>
      </div>
    );
};

export default SizeTabs;
