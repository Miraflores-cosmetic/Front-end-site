import React from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';

// 1. Update Interface to match your Real Data
export interface OrderProduct {
  variantId: string;
  title: string;
  size: string; // In your data, this seems to be the name or description
  thumbnail: string;
  price: number;
  oldPrice: number | null;
  discount: number | string | null;
  quantity: number;
  isGift?: boolean; // Optional, in case you handle gifts logic later
}

interface OrderCartListProps {
  cartData: OrderProduct[];
}

const CardList: React.FC<OrderCartListProps> = ({ cartData }) => {
  
  // Helper to format 880 -> 880 ₽
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      {cartData.map((item) => (
        
        <div className={styles.orderCart} key={item.variantId}>
          {/* Image */}
          <figure className={styles.cartImageWrapper}>
            <ImageWithFallback 
              src={item.thumbnail} 
              alt={item.title} 
              className={styles.kremImage}
            />
          </figure>

          <div className={styles.cardInfoWrapper}>
            <div className={styles.top}>
              <div className={styles.texts}>
                {/* Title */}
                <p className={styles.name}>{item.title}</p>
                
                {/* Size - check to ensure it's not identical to title to avoid duplicate text */}
                {item.size && item.size !== item.title && (
                   <p className={styles.size}>{item.size}</p>
                )}
              </div>

              {/* Discount - render only if exists */}
              {item.discount && (
                <div className={styles.discount}>
                    {/* Add % sign if it's just a number */}
                    {typeof item.discount === 'number' ? `-${item.discount}%` : item.discount}
                </div>
              )}
            </div>

            <div className={styles.bottom}>
              {/* Quantity */}
              <p className={styles.count}>{item.quantity} шт.</p>

              {item.isGift ? (
                <div className={styles.surprise}>Подарок</div>
              ) : (
                <div className={styles.price}>
                  {/* Old Price - render only if exists */}
                  {item.oldPrice && (
                     <p className={styles.priceOld}>{formatPrice(item.oldPrice)}</p>
                  )}
                  {/* New/Current Price */}
                  <p className={styles.priceNew}>{formatPrice(item.price)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default CardList;