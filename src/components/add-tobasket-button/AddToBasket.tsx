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
  variant?: 'home' | 'product'; // 'home' для главной, 'product' для страницы товара
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
  variant = 'home' // По умолчанию для главной страницы
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const dispatch = useDispatch();
  const toast = useToast();

  // Get the actual quantity from Redux store
  const cartItem = useSelector((state: RootState) => 
    state.checkout.lines.find(item => item.variantId === activeVariantId)
  );
  
  const count = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (disabled || !activeVariantId) return;
    
    if (count === 0) {
      // First time adding - use addItemToCart
      dispatch(
        addItemToCart({
          variantId: activeVariantId,
          quantity: 1,
          title: title,
          thumbnail: thumbnail,
          price: price,
          oldPrice: oldPrice,
          discount: discount,
          size: size
        })
      );
      toast.success('Товар добавлен в корзину');
    } else {
      // Already in cart - just increase quantity
      dispatch(increaseQuantity(activeVariantId));
      toast.success('Количество увеличено');
    }
  };

  const handleRemove = () => {
    if (!activeVariantId) return;
    
    if (count > 1) {
      dispatch(decreaseQuantity(activeVariantId));
      toast.success('Количество уменьшено');
    } else {
      // If count is 1, remove item completely
      dispatch(removeItemFromCart(activeVariantId));
      toast.success('Товар удален из корзины');
    }
  };


  const buttonText = count === 0 ? (isHovered ? hoverText : defaultText) : activeText;
  const isProductPage = variant === 'product';

  return (
    <div className={`${styles.wrapper} ${isProductPage ? styles.productPageWrapper : styles.homeWrapper}`}>
      <button
        onClick={handleAdd}
        className={`${styles.mainBtn} ${isProductPage ? styles.productPageBtn : styles.homeBtn}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        type='button'
        disabled={disabled}
      >
        {buttonText}
      </button>

      {productId && !isProductPage && (
        <div className={styles.favoriteWrapper}>
          <FavoriteButton productId={productId} className={styles.favoriteButtonInBasket} />
        </div>
      )}
    </div>
  );
};

export default AddToCartButton;