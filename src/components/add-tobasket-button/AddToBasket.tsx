import React, { useState } from 'react';
import styles from './AddToBasket.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from '@/components/toast/toast';
import {
  addItemToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItemFromCart
} from '@/store/slices/checkoutSlice';
import { RootState } from '@/store/store';
import { FavoriteButton } from '@/components/favorite-button/FavoriteButton';
import { isAtOrOverLineLimit, maxQuantityForVariantLine } from '@/utils/checkoutLineLimits';

interface AddToCartButtonProps {
  defaultText?: string;
  hoverText?: string;
  activeText?: string;
  activeVariantId: string | null;
  title: string;
  thumbnail: string;
  price: number;
  oldPrice?: number | null;
  discount?: number | null;
  size: string;
  disabled?: boolean;
  productId?: string;
  variant?: 'home' | 'product' | 'card';
  /** Лимит с варианта (Saleor); влияет на + и добавление */
  quantityLimitPerCustomer?: number | null;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  defaultText = 'Добавить в корзину',
  hoverText = 'Добавить в корзину',
  activeText = 'Добавлено',
  activeVariantId,
  title,
  thumbnail,
  price,
  oldPrice = null,
  discount = null,
  size,
  disabled = false,
  productId,
  variant = 'home',
  quantityLimitPerCustomer = null
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const dispatch = useDispatch();
  const toast = useToast();

  const cartItem = useSelector((state: RootState) =>
    state.checkout.lines.find(item => item.variantId === activeVariantId)
  );

  const count = cartItem?.quantity || 0;
  const limitSrc = cartItem?.quantityLimitPerCustomer ?? quantityLimitPerCustomer;
  const maxQ = maxQuantityForVariantLine(limitSrc);
  const atLimit = count > 0 && count >= maxQ;

  const handleAdd = () => {
    if (disabled || !activeVariantId) return;

    if (count === 0) {
      dispatch(
        addItemToCart({
          variantId: activeVariantId,
          quantity: 1,
          title: title,
          thumbnail: thumbnail,
          price: price,
          oldPrice: oldPrice,
          discount: discount,
          size: size,
          quantityLimitPerCustomer
        })
      );
      toast.success('Товар добавлен в корзину');
      return;
    }

    if (atLimit) {
      toast.error('Достигнуто максимальное количество для заказа');
      return;
    }
    dispatch(increaseQuantity(activeVariantId));
    toast.success('Количество увеличено');
  };

  const handleRemove = () => {
    if (!activeVariantId) return;

    if (count > 1) {
      dispatch(decreaseQuantity(activeVariantId));
      toast.success('Количество уменьшено');
    } else {
      dispatch(removeItemFromCart(activeVariantId));
      toast.success('Товар удален из корзины');
    }
  };

  const buttonText = count === 0 ? (isHovered ? hoverText : defaultText) : activeText;
  const isProductPage = variant === 'product';
  const isCard = variant === 'card';

  return (
    <div
      className={[
        styles.wrapper,
        isProductPage ? styles.productPageWrapper : styles.homeWrapper,
        isCard ? styles.cardWrapper : ''
      ].filter(Boolean).join(' ')}
    >
      {count === 0 ? (
        <button
          onClick={handleAdd}
          className={[
            styles.mainBtn,
            isProductPage ? styles.productPageBtn : styles.homeBtn,
            isCard ? styles.cardBtn : ''
          ].filter(Boolean).join(' ')}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          type='button'
          disabled={disabled}
        >
          {buttonText}
        </button>
      ) : (
        <div
          className={[
            styles.stepper,
            isProductPage ? styles.stepperProduct : styles.stepperHome,
            isCard ? styles.stepperCard : ''
          ].filter(Boolean).join(' ')}
        >
          <button
            type='button'
            className={[
              styles.stepperBtn,
              isCard ? styles.stepperBtnCard : ''
            ].filter(Boolean).join(' ')}
            onClick={handleRemove}
            aria-label='Уменьшить количество'
          >
            −
          </button>
          <span className={styles.stepperCount}>{count}</span>
          <button
            type='button'
            className={[
              styles.stepperBtn,
              isCard ? styles.stepperBtnCard : ''
            ].filter(Boolean).join(' ')}
            onClick={handleAdd}
            disabled={disabled || isAtOrOverLineLimit(count, limitSrc)}
            aria-label='Увеличить количество'
          >
            +
          </button>
        </div>
      )}

      {productId && variant === 'home' && (
        <div className={styles.favoriteWrapper}>
          <FavoriteButton productId={productId} className={styles.favoriteButtonInBasket} />
        </div>
      )}
    </div>
  );
};

export default AddToCartButton;
