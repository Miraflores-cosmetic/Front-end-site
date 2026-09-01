import React, { useState } from 'react';
import styles from './FaceCard.module.scss';
import gift from '@/assets/icons/gift.svg';
import sun from '@/assets/icons/sun.svg';
import moon from '@/assets/icons/moon.svg';
import whiteGift from '@/assets/icons/whiteGift.webp';
import { useToast } from '@/components/toast/toast';

interface Product {
  id: number | string;
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

/**
 * Демо-карточка /face: фейковые id 1..n. Не пишем в корзину —
 * sync удалил бы их как missing и портил бы реальные позиции.
 */
export const FaceCard: React.FC<{ product: Product }> = ({ product }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoveredGift, setIsHoveredGift] = useState(false);
  const toast = useToast();

  const handleAddToCart = () => {
    toast.warning('Демо-карточка — товары лица скоро в каталоге');
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
            <button type="button" className={styles.addToCart} onClick={handleAddToCart}>
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
          <button type="button" className={styles.size50}>50 мл</button>
          <button type="button" className={styles.size100}>100 мл</button>
        </div>
      </div>
      <div className={styles.info}>
        <div className={styles.txtWrapper}>
          <h3 className={styles.name}>{product.title}</h3>
          <p className={styles.desc}>{product.description}</p>
        </div>
        <div className={styles.priceWrapper}>
          {product.oldPrice && <span className={styles.oldPrice}>{product.oldPrice}₽</span>}
          <span className={styles.price}>{product.price}₽</span>
        </div>
      </div>
    </div>
  );
};
