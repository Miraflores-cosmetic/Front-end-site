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
import { isAtOrOverLineLimit, effectiveLineQuantityCap } from '@/utils/checkoutLineLimits';
import { isVariantOutOfStock } from '@/utils/stock';
import {
  cartWouldMixGiftAndPhysical,
  isGiftDenomVariantId,
} from '@/utils/giftDenomCart';
import {
  MetrikaGoal,
  isFavoritesPathStrict,
  markCartFromFavorites,
  reachGoal,
} from '@/lib/metrika';

interface AddToCartButtonProps {
  defaultText?: string;
  hoverText?: string;
  activeText?: string;
  activeVariantId: string | null;
  shadeId?: string | null;
  title: string;
  productType?: string | null;
  thumbnail: string;
  price: number;
  oldPrice?: number | null;
  discount?: number | null;
  size: string;
  slug?: string;
  disabled?: boolean;
  productId?: string;
  variant?: 'home' | 'product' | 'card';
  /** Лимит с варианта (каталог); влияет на + и добавление */
  quantityLimitPerCustomer?: number | null;
  quantityAvailable?: number | null;
  trackInventory?: boolean | null;
  /** orderMinQty варианта при первом добавлении (по умолчанию 1). */
  minQuantity?: number | null;
  /**
   * Карточка с несколькими объёмами: вместо добавления default-варианта
   * открывает выбор объёма. На PDP не передавать.
   */
  onRequestAdd?: () => void;
  /** Всегда кнопка «В корзину» (без степпера) — для мульти-объёмных карточек. */
  preferAddButton?: boolean;
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  defaultText = 'Добавить в корзину',
  hoverText = 'Добавить в корзину',
  activeText = 'Добавлено',
  activeVariantId,
  shadeId = null,
  title,
  productType,
  thumbnail,
  price,
  oldPrice = null,
  discount = null,
  size,
  slug,
  disabled = false,
  productId,
  variant = 'home',
  quantityLimitPerCustomer = null,
  quantityAvailable = null,
  trackInventory = null,
  minQuantity = 1,
  onRequestAdd,
  preferAddButton = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const dispatch = useDispatch();
  const toast = useToast();
  const cartLines = useSelector((state: RootState) => state.checkout.lines);
  const cartItem = useSelector((state: RootState) =>
    state.checkout.lines.find((item) => item.variantId === activeVariantId),
  );

  const count = cartItem?.quantity || 0;
  const limitSrc = cartItem?.quantityLimitPerCustomer ?? quantityLimitPerCustomer;
  const availSrc = cartItem?.quantityAvailable ?? quantityAvailable;
  const maxQ = effectiveLineQuantityCap(limitSrc, availSrc);
  const atLimit = count > 0 && count >= maxQ;
  const lineKey = activeVariantId ? { variantId: activeVariantId } : null;

  const lineOutOfStock = isVariantOutOfStock({
    trackInventory: cartItem?.trackInventory ?? trackInventory,
    quantityAvailable: cartItem?.quantityAvailable ?? quantityAvailable
  });

  const handleAdd = () => {
    if (disabled) return;

    if (preferAddButton && onRequestAdd) {
      onRequestAdd();
      return;
    }

    if (!activeVariantId || !lineKey) return;

    if (lineOutOfStock) {
      toast.error('Нет в наличии');
      return;
    }

    if (count === 0) {
      if (onRequestAdd) {
        onRequestAdd();
        return;
      }
      const giftDenom = isGiftDenomVariantId(activeVariantId);
      if (
        cartWouldMixGiftAndPhysical(cartLines, {
          variantId: activeVariantId,
          isGiftDenom: giftDenom,
        })
      ) {
        toast.error(
          'Нельзя смешивать подарочные сертификаты и обычные товары — оформите отдельно',
        );
        return;
      }
      const qty =
        typeof minQuantity === 'number' && Number.isFinite(minQuantity) && minQuantity > 0
          ? Math.floor(minQuantity)
          : 1;
      dispatch(
        addItemToCart({
          variantId: activeVariantId,
          quantity: qty,
          title: title,
          productType: productType?.trim() || null,
          thumbnail: thumbnail,
          price: price,
          oldPrice: oldPrice,
          discount: discount,
          size: size,
          slug,
          quantityLimitPerCustomer,
          quantityAvailable,
          trackInventory,
          isGiftDenom: giftDenom || undefined,
        })
      );
      reachGoal(MetrikaGoal.addToCart, {
        variantId: activeVariantId,
        slug: slug ?? undefined,
      });
      if (isFavoritesPathStrict(window.location.pathname, window.location.search)) {
        markCartFromFavorites();
      }
      toast.success(giftDenom ? 'Сертификат добавлен в корзину' : 'Товар добавлен в корзину');
      return;
    }

    if (atLimit) {
      toast.error('Достигнуто максимальное количество для заказа');
      return;
    }
    dispatch(increaseQuantity(lineKey));
    toast.success('Количество увеличено');
  };

  const handleRemove = () => {
    if (!lineKey) return;

    if (count > 1) {
      dispatch(decreaseQuantity(lineKey));
      toast.success('Количество уменьшено');
    } else {
      dispatch(removeItemFromCart(lineKey));
      toast.success('Товар удален из корзины');
    }
  };

  const showAddButton = preferAddButton || count === 0;
  const buttonText = showAddButton
    ? isHovered
      ? hoverText
      : defaultText
    : activeText;
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
      {showAddButton ? (
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
          disabled={disabled || (!preferAddButton && lineOutOfStock)}
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
            disabled={disabled || isAtOrOverLineLimit(count, limitSrc, availSrc) || lineOutOfStock}
            aria-label='Увеличить количество'
          >
            +
          </button>
        </div>
      )}

      {productId && variant !== 'card' ? (
        <div className={styles.favoriteWrapper}>
          <FavoriteButton productId={productId} variant="inline" />
        </div>
      ) : null}
    </div>
  );
};

export default AddToCartButton;
