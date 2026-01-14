import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FavoritesContent.module.scss';
import gift from '@/assets/icons/gift.svg';
import whiteGift from '@/assets/icons/whiteGift.webp';
import { useDispatch } from 'react-redux';
import { addItemToCart } from '@/store/slices/checkoutSlice';
import { useToast } from '@/components/toast/toast';

interface FavoriteCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  image: string;
  hoverImage: string;
  slug?: string;
  variantId?: string;
}

const FavoriteCard: React.FC<FavoriteCardProps> = ({
  id,
  title,
  description,
  price,
  oldPrice,
  discount,
  image,
  hoverImage,
  slug,
  variantId
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredGift, setIsHoveredGift] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const handleAddToCart = () => {
    if (variantId) {
      dispatch(addItemToCart({
        variantId,
        quantity: 1,
        title,
        thumbnail: image,
        price,
        oldPrice: oldPrice || null,
        discount: discount || null,
        size: ''
      }));
      toast.success('Товар добавлен в корзину');
    }
  };

  const handleCardClick = () => {
    if (slug) {
      navigate(`/product/${slug}`);
    }
  };

  return (
    <article className={styles.wrapper}>
      <div
        className={styles.cart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
        style={{
          backgroundImage: `url(${isHovered ? hoverImage : image})`
        }}
      >
        {discount && (
          <div className={styles.discountBadge}>-{discount}%</div>
        )}
        {isHovered && (
          <div className={styles.addToCardWrapper}>
            <button 
              className={styles.addToCart}
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart();
              }}
            >
              Добавить в корзину
            </button>
            <div
              className={styles.gift}
              onMouseEnter={() => setIsHoveredGift(true)}
              onMouseLeave={() => setIsHoveredGift(false)}
            >
              <img src={isHoveredGift ? whiteGift : gift} alt='gift' />
            </div>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.txtWrapper}>
          <h3 className={styles.name}>{title}</h3>
          {description && <p className={styles.desc}>{description}</p>}
        </div>
        <div className={styles.priceWrapper}>
          {oldPrice && oldPrice > price && (
            <span className={styles.oldPrice}>{Math.round(oldPrice).toLocaleString('ru-RU')}₽</span>
          )}
          <span className={styles.price}>{Math.round(price).toLocaleString('ru-RU')}₽</span>
        </div>
      </div>
    </article>
  );
};

export default FavoriteCard;
