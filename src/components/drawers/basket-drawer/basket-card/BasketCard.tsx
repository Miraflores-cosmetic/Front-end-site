'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import styles from './BasketCard.module.scss';
import { BasketCardProps } from '@/types/checkout';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { AppDispatch } from '@/store/store';
import {
  removeItemFromCart,
  increaseQuantity,
  decreaseQuantity,
} from '@/store/slices/checkoutSlice';
import { isAtOrOverLineLimit } from '@/utils/checkoutLineLimits';
import { isVariantOutOfStock } from '@/utils/stock';

const BasketCard: React.FC<BasketCardProps> = ({
  variantId,
  thumbnail,
  title,
  slug,
  size,
  quantity,
  oldPrice,
  price,
  isGift = false,
  quantityLimitPerCustomer,
  quantityAvailable,
  trackInventory,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isProductLink = Boolean(slug && !isGift);
  const lineKey = { variantId };

  const handleProductNavigate = () => {
    if (!slug || isGift) return;
    dispatch(closeDrawer());
    navigate(`/product/${slug}`);
  };

  const lineOutOfStock =
    !isGift &&
    isVariantOutOfStock({
      trackInventory,
      quantityAvailable,
    });

  const plusDisabled =
    !isGift &&
    (isAtOrOverLineLimit(quantity, quantityLimitPerCustomer, quantityAvailable) || lineOutOfStock);

  const lineTotal = Math.round((price ?? 0) * quantity);
  const unitPrice = Math.round(price ?? 0);
  const listPrice =
    oldPrice && typeof oldPrice === 'number' && oldPrice > price
      ? Math.round(oldPrice)
      : null;

  return (
    <article className={styles.line}>
      {isProductLink ? (
        <button
          type="button"
          className={styles.thumbLink}
          onClick={handleProductNavigate}
          aria-label={title}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className={styles.thumb} />
          ) : (
            <span className={styles.thumbPlaceholder} aria-hidden />
          )}
        </button>
      ) : (
        <div className={styles.thumbLink} aria-hidden={!thumbnail}>
          {thumbnail ? (
            <img src={thumbnail} alt="" className={styles.thumb} />
          ) : (
            <span className={styles.thumbPlaceholder} aria-hidden />
          )}
        </div>
      )}

      <div className={styles.lineBody}>
        <div className={styles.lineTop}>
          {isProductLink ? (
            <button
              type="button"
              className={styles.lineName}
              onClick={handleProductNavigate}
            >
              {title}
            </button>
          ) : (
            <p className={styles.lineNameStatic}>{title}</p>
          )}
          {!isGift ? (
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => dispatch(removeItemFromCart(lineKey))}
              aria-label="Удалить"
            >
              ×
            </button>
          ) : null}
        </div>

        {isGift ? (
          <span className={styles.giftChip}>Подарок</span>
        ) : size ? (
          <p className={styles.lineMeta}>{size}</p>
        ) : null}

        {lineOutOfStock ? (
          <p className={styles.outOfStock}>Нет в наличии</p>
        ) : null}

        <div className={styles.lineBottom}>
          {!isGift ? (
            <div className={styles.qtyStepper} aria-label="Количество">
              <button
                type="button"
                className={styles.qtyBtn}
                aria-label={quantity <= 1 ? 'Удалить' : 'Меньше'}
                onClick={() => {
                  if (quantity <= 1) dispatch(removeItemFromCart(lineKey));
                  else dispatch(decreaseQuantity(lineKey));
                }}
              >
                {quantity <= 1 ? '×' : '−'}
              </button>
              <span className={styles.qtyValue}>{quantity}</span>
              <button
                type="button"
                className={styles.qtyBtn}
                aria-label="Больше"
                disabled={plusDisabled}
                onClick={() => {
                  if (!plusDisabled) dispatch(increaseQuantity(lineKey));
                }}
              >
                +
              </button>
            </div>
          ) : (
            <span className={styles.giftQty}>×{quantity}</span>
          )}

          <div className={styles.linePrices}>
            {isGift ? (
              <span className={styles.linePrice}>0₽</span>
            ) : (
              <>
                {listPrice != null ? (
                  <span className={styles.listPrice}>
                    {listPrice.toLocaleString('ru-RU')}₽
                  </span>
                ) : null}
                {quantity > 1 ? (
                  <span className={styles.unitPrice}>
                    {unitPrice.toLocaleString('ru-RU')}₽
                  </span>
                ) : null}
                <span className={styles.linePrice}>
                  {lineTotal.toLocaleString('ru-RU')}₽
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default BasketCard;
