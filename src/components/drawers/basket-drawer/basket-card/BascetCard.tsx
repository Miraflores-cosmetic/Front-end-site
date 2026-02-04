'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import styles from './BasketCard.module.scss';
import { BasketCardProps } from '@/types/checkout';
import trash from '@/assets/icons/trash.svg';
import add from '@/assets/icons/add.svg';
import minus from '@/assets/icons/minus.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import {
  removeItemFromCart,
  increaseQuantity,
  decreaseQuantity
} from '@/store/slices/checkoutSlice';

const BasketCard: React.FC<BasketCardProps> = ({
  variantId,
  thumbnail,
  title,
  size,
  quantity,
  discount,
  oldPrice,
  price,
  isGift = false,
}) => {
  const isMobile = useScreenMatch(550); // Using 550 as requested
  const dispatch = useDispatch();

  return (
    <div className={styles.basketCardWrapper}>
      <div className={styles.basketCard}>
        <div className={styles.basketImage}>
          {thumbnail ? (
            <img src={thumbnail} alt={title} className={styles.kremImage} />
          ) : (
            <div className='placeholder' />
          )}
        </div>

        <div className={styles.basketInfo}>
          <div className={styles.topInfo}>
            <div className={styles.productNameSizeBlock}>
              <p className={styles.productName}>{title}</p>
              {isGift && <p className={styles.productSize}>Подарок</p>}
              {!isGift && <p className={styles.productSize}>{size}</p>}

              {isMobile && !isGift && (
                <div className={styles.mobilePriceRow}>
                  <p className={styles.toMobile}>
                    {Math.round(price).toLocaleString('ru-RU') + '₽'}
                  </p>
                  {oldPrice && typeof oldPrice === 'number' && oldPrice > 0 && oldPrice > price && (
                    <p className={styles.fromMobile}>
                      {Math.round(oldPrice).toLocaleString('ru-RU') + '₽'}
                    </p>
                  )}
                  {discount && discount > 0 && (
                    <span className={styles.mobileDiscount}>-{discount}%</span>
                  )}
                </div>
              )}
              {isMobile && isGift && (
                <div className={styles.mobilePriceRow}>
                  <p className={styles.toMobile}>Подарок</p>
                </div>
              )}
            </div>
          </div>

          {!isGift && (
            <div className={styles.bottomInfo}>
              {Boolean(quantity > 1) && (
                <img
                  src={minus}
                  alt='minus'
                  className={styles.trashImage}
                  onClick={() => dispatch(decreaseQuantity(variantId))}
                />
              )}
              {Boolean(quantity < 2) && (
                <img
                  src={trash}
                  alt='trash'
                  className={styles.trashImage}
                  onClick={() => dispatch(removeItemFromCart(variantId))}
                />
              )}
              <p className={styles.trashCount}>{quantity}</p>
              <img
                src={add}
                alt='add'
                className={styles.addImage}
                onClick={() => dispatch(increaseQuantity(variantId))}
              />
            </div>
          )}
          {isGift && (
            <div className={styles.bottomInfo}>
              <p className={styles.trashCount}>{quantity}</p>
            </div>
          )}
        </div>

        <div className={styles.baskePrice}>
          {isGift ? (
            <p className={styles.to}>Подарок</p>
          ) : (
            <>
              <p
                className={
                  Boolean(discount == null || discount === 0) ? styles.discountEmpty : styles.discount
                }
              >
                {Boolean(discount == null || discount === 0) ? ' ' : '-' + discount + '%'}
              </p>
              <div className={styles.fromTo}>
                {oldPrice && typeof oldPrice === 'number' && oldPrice > 0 && oldPrice > price && (
                  <p className={styles.from}>{Math.round(oldPrice).toLocaleString('ru-RU') + '₽'}</p>
                )}
                <p className={styles.to}>{Math.round(price).toLocaleString('ru-RU') + '₽'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {isMobile && !isGift && (
        <div className={styles.mobileControlsRow}>
          {Boolean(quantity === 1) ? (
            <button
              className={styles.controlBtn}
              onClick={() => dispatch(removeItemFromCart(variantId))}
            >
              <img src={trash} alt='remove' />
            </button>
          ) : (
            <button
              className={styles.controlBtn}
              onClick={() => dispatch(decreaseQuantity(variantId))}
            >
              <img src={minus} alt='decrease' />
            </button>
          )}

          <span className={styles.quantityDisplay}>{quantity}</span>

          <button
            className={styles.controlBtn}
            onClick={() => dispatch(increaseQuantity(variantId))}
          >
            <img src={add} alt='increase' />
          </button>
        </div>
      )}
      {isMobile && isGift && (
        <div className={styles.mobileControlsRow}>
          <span className={styles.quantityDisplay}>Подарок</span>
        </div>
      )}
    </div>
  );
};

export default BasketCard;
