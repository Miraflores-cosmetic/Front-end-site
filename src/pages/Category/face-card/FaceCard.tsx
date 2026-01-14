import React, { useState } from 'react';
import styles from './FaceCard.module.scss';
import gift from '@/assets/icons/gift.svg';
import sun from '@/assets/icons/sun.svg';
import moon from '@/assets/icons/moon.svg';
import whiteGift from '@/assets/icons/whiteGift.webp';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addItemToCart } from '@/store/slices/checkoutSlice';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  label?: string;
  image: string;
  type: string;
  hoverImage: string;
}

export const FaceCard: React.FC<{ product: Product }> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredGift, setIsHoveredGift] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    // dispatch(
    //   addItemToCart({
    //     variantId:String(product.id),
    //     quantity: 1,
    //     title: product.title,
    //     thumbnail: product.image,
    //     price: product.price,
    //     size: product.label ?? '50 мл'
    //   })
    // );

    console.log(
      "hi"
    )
  };

  return (
    <div
      className={`${styles.card} ${isHovered ? styles.cardHovered : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.wrapperImage}>
        <figure className={styles.imageContens}>
          <img src={isHovered ? product.hoverImage : product.image} alt='' />
        </figure>
        <div>
          {product.discount ? (
            <span className={styles.discount}>-{product.discount}%</span>
          ) : (
            <span className={styles.label}>{product.label}</span>
          )}
        </div>
        <div className={styles.type}>
          <img src={product.type === 'sun' ? sun : moon} alt='' />
        </div>

        {isHovered && (
          <div className={styles.addToCardWrapper}>
            <button className={styles.addToCart} onClick={handleAddToCart}>
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
        <div className={styles.sizeWrapperContent}>
          <button className={styles.size50}>50 мл</button>
          <button className={styles.size100}>100 мл</button>
        </div>
      </div>
      <div className={styles.info}>
        <div className={styles.txtWrapper}>
          <h3 className={styles.name}>{product.title}</h3>
          <p className={styles.desc}>
            {product.description?.length > 200
              ? `${product.description.slice(0, 200)}…`
              : product.description}
          </p>
        </div>
        <div className={styles.priceWrapper}>
          {product.oldPrice && <span className={styles.oldPrice}>{product.oldPrice}₽</span>}
          <span className={styles.price}>{product.price}₽</span>
        </div>
      </div>
    </div>
  );
};
