import React from 'react';
import styles from './OrderCard.module.scss';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

export interface CartItem {
  id: number;
  image: string;
  alt: string;
  name: string;
  size: string;
  count: string;
  isGift?: boolean;
}

interface OrderCartListProps {
  cartData: CartItem[];
}

const CardList: React.FC<OrderCartListProps> = ({ cartData }) => {
  return (
    <>
      {cartData.map(item => (
        <div className={styles.orderCart} key={item.id}>
          <figure className={styles.cartImageWrapper}>
            <ImageWithFallback 
              src={item.image} 
              alt={item.alt} 
              className={styles.kremImage}
            />
          </figure>

          <div className={styles.cardInfoWrapper}>
            <div className={styles.top}>
              <div className={styles.texts}>
                <p className={styles.name}>{item.name}</p>
                <p className={styles.size}>{item.size}</p>
              </div>
            </div>

            <div className={styles.bottom}>
              <p className={styles.count}>{item.count}</p>

              {item.isGift ? (
                <div className={styles.surprise}>Подарок</div>
              ) : (
                <div className={styles.price}>9050₽</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default CardList;
