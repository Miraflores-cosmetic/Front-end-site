import React from 'react';
import { Link } from 'react-router-dom';
import StarRating from '@/components/rating/StarRating';
import SizeTabs from '@/components/size-tabs/SizeTabs';
import Etaps, { type Etap } from '@/components/etpas/Etaps';
import AddToCartButton from '@/components/add-tobasket-button/AddToBasket';
import type { ProductSliceItem, ProductVariant } from '@/types/productSlice';
import { getVolumeFromVariant } from '@/utils/getVolumeFromVariant';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
import styles from '../ProductDetail.module.scss';

type ProductBuyBoxProps = {
  item: ProductSliceItem;
  activeVariant: ProductVariant | undefined;
  activeVariantId: string | null;
  pageShortHtml: string;
  etapsData: Etap[];
  ratingAvg: number;
  ratingCount: number;
  currentPrice: number;
  oldPrice: number | null;
  discount: number | null;
  outOfStock: boolean;
  showDesktopAtc: boolean;
  /** Скрытый через CSS title не должен дублировать h1 в AT */
  titleAriaHidden?: boolean;
};

export function ProductBuyBox({
  item,
  activeVariant,
  activeVariantId,
  pageShortHtml,
  etapsData,
  ratingAvg,
  ratingCount,
  currentPrice,
  oldPrice,
  discount,
  outOfStock,
  showDesktopAtc,
  titleAriaHidden = false,
}: ProductBuyBoxProps) {
  const skuValue = activeVariant?.node?.sku ?? '';
  const nazvanieAttr = (activeVariant?.node?.attributes || []).find(
    (attr) => attr.attribute?.slug === 'nazvanie-iz-nacionalnogo-kataloga',
  );
  const nazvanieValue =
    nazvanieAttr?.values?.[0]?.name ??
    nazvanieAttr?.values?.[0]?.plainText ??
    nazvanieAttr?.values?.[0]?.slug ??
    '';

  const volume = getVolumeFromVariant(activeVariant);
  const reviewsHref = `/reviews?product=${encodeURIComponent(item.slug)}`;
  const safeShortHtml = sanitizeCmsHtml(pageShortHtml);
  const formatPrice = (amount: number) => Math.round(amount).toLocaleString('ru-RU');

  return (
    <article className={styles.infoPart}>
      <div className={styles.infoTop}>
        <h1 className={styles.title} aria-hidden={titleAriaHidden || undefined}>
          {item.name}
        </h1>
        {skuValue || nazvanieValue ? (
          <div className={styles.productMetaBlock}>
            {nazvanieValue ? (
              <p className={styles.productMetaLine}>{nazvanieValue}</p>
            ) : null}
            {skuValue ? (
              <p className={styles.productMetaLine}>GTIN: {skuValue}</p>
            ) : null}
          </div>
        ) : null}
        <Link to={reviewsHref} className={styles.reviewsLink}>
          <StarRating rating={ratingAvg} text={`Отзывы (${ratingCount})`} />
        </Link>
      </div>

      {/* Mobile: сразу под галереей; desktop: внизу колонки (order + margin). */}
      <div className={styles.purchaseBlock}>
        <div className={styles.purchasePrice}>
          {outOfStock ? (
            <span className={styles.purchaseOutOfStock}>Нет в наличии</span>
          ) : (
            <>
              <span className={styles.purchasePriceMain}>{formatPrice(currentPrice)}₽</span>
              {oldPrice != null && oldPrice > currentPrice ? (
                <span className={styles.purchasePriceOld}>{formatPrice(oldPrice)}₽</span>
              ) : null}
            </>
          )}
        </div>
        {activeVariantId ? (
          <SizeTabs options={item.variants || []} activeVariantId={activeVariantId} />
        ) : null}
        {showDesktopAtc && activeVariant ? (
          <AddToCartButton
            activeVariantId={activeVariantId}
            title={item.name}
            thumbnail={item.thumbnail}
            price={currentPrice}
            oldPrice={oldPrice}
            discount={discount}
            size={volume}
            slug={item.slug}
            defaultText="Добавить в корзину"
            activeText="Добавить в корзину"
            hoverText="Добавить в корзину"
            disabled={!activeVariantId || outOfStock}
            productId={item.id}
            variant="product"
            quantityLimitPerCustomer={
              activeVariant.node.quantityLimitPerCustomer ?? null
            }
            quantityAvailable={activeVariant.node.quantityAvailable ?? null}
            trackInventory={activeVariant.node.trackInventory ?? null}
          />
        ) : null}
      </div>

      <div className={styles.infoBottom}>
        {safeShortHtml ? (
          <div
            className={styles.desc}
            dangerouslySetInnerHTML={{ __html: safeShortHtml }}
          />
        ) : null}
        <Etaps items={etapsData} />
      </div>
    </article>
  );
}
