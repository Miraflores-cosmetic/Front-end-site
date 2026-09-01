import React, { useEffect } from 'react';
import AddToCartButton from '@/components/add-tobasket-button/AddToBasket';
import type { ProductSliceItem, ProductVariant } from '@/types/productSlice';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import styles from '../ProductDetail.module.scss';

/** Высота sticky ATC + зазор — toast и footer clearance. */
export const PDP_STICKY_CLEARANCE = 'calc(68px + env(safe-area-inset-bottom, 0px))';

type ProductStickyBarProps = {
  item: ProductSliceItem;
  activeVariant: ProductVariant;
  activeVariantId: string | null;
  currentPrice: number;
  oldPrice: number | null;
  discount: number | null;
  formattedPrice: string;
  formattedOldPrice: string | null;
  outOfStock: boolean;
};

export function ProductStickyBar({
  item,
  activeVariant,
  activeVariantId,
  currentPrice,
  oldPrice,
  discount,
  formattedPrice,
  formattedOldPrice,
  outOfStock,
}: ProductStickyBarProps) {
  const volume = getVolumeFromVariant(activeVariant);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--toast-clearance', PDP_STICKY_CLEARANCE);
    root.style.setProperty('--pdp-sticky-clearance', PDP_STICKY_CLEARANCE);
    return () => {
      root.style.removeProperty('--toast-clearance');
      root.style.removeProperty('--pdp-sticky-clearance');
    };
  }, []);

  return (
    <div className={styles.stickyBar} role="region" aria-label="Панель добавления в корзину">
      <div className={styles.stickyBarInner}>
        <div className={styles.stickyMeta}>
          {volume ? <span className={styles.stickyVolume}>{volume}</span> : null}
          <div className={styles.stickyPrice}>
            {outOfStock ? (
              <span className={styles.stickyPriceOutOfStock}>Нет в наличии</span>
            ) : (
              <>
                <span className={styles.stickyPriceMain}>{formattedPrice}₽</span>
                {formattedOldPrice ? (
                  <span className={styles.stickyPriceOld}>{formattedOldPrice}₽</span>
                ) : null}
              </>
            )}
          </div>
        </div>
        <AddToCartButton
          activeVariantId={activeVariantId}
          title={item.name}
          thumbnail={item.thumbnail}
          price={currentPrice}
          oldPrice={oldPrice}
          discount={discount}
          size={volume}
          slug={item.slug}
          defaultText="В корзину"
          activeText="В корзину"
          hoverText="В корзину"
          disabled={!activeVariantId || outOfStock}
          productId={item.id}
          variant="product"
          quantityLimitPerCustomer={
            activeVariant.node.quantityLimitPerCustomer ?? null
          }
          quantityAvailable={activeVariant.node.quantityAvailable ?? null}
          trackInventory={activeVariant.node.trackInventory ?? null}
        />
      </div>
    </div>
  );
}
