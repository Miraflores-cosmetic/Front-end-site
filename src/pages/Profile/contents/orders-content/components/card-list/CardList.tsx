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
  quantity?: number;
  price?: number;
  isGift?: boolean;
  productId?: string;
}

function formatPrice(amount: number): string {
  return `${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
}

interface OrderCartListProps {
  cartData: CartItem[];
  onReview?: (productId: string, productName: string) => void;
  asListItems?: boolean;
}

function OrderLineItem({
  item,
  onReview,
}: {
  item: CartItem;
  onReview?: (productId: string, productName: string) => void;
}) {
  const qty = item.quantity ?? (parseInt(item.count, 10) || 1);

  return (
    <div className={styles.orderLine}>
      <div className={styles.imageWrapper}>
        {qty > 1 ? (
          <div className={styles.countWrapper}>
            <span className={styles.count}>{qty}</span>
          </div>
        ) : null}
        <ImageWithFallback
          src={item.image}
          alt={item.alt}
          className={styles.image}
        />
      </div>

      <div className={styles.lineBody}>
        <div className={styles.lineTop}>
          <p className={styles.name}>{item.name}</p>
          {!item.isGift && item.price != null ? (
            <p className={styles.linePrice}>{formatPrice(item.price)}</p>
          ) : null}
        </div>
        {item.size ? <p className={styles.meta}>{item.size}</p> : null}
        {item.isGift ? (
          <span className={styles.giftChip}>Подарок</span>
        ) : (
          <p className={styles.meta}>{item.count}</p>
        )}
        {onReview && item.productId && !item.isGift ? (
          <button
            type="button"
            className={styles.reviewButton}
            onClick={() => onReview(item.productId!, item.name)}
          >
            Оставить отзыв
          </button>
        ) : null}
      </div>
    </div>
  );
}

const CardList: React.FC<OrderCartListProps> = ({ cartData, onReview, asListItems }) => {
  if (asListItems) {
    return (
      <>
        {cartData.map(item => (
          <li key={item.id} className={styles.listItem}>
            <OrderLineItem item={item} onReview={onReview} />
          </li>
        ))}
      </>
    );
  }

  return (
    <>
      {cartData.map(item => (
        <OrderLineItem key={item.id} item={item} onReview={onReview} />
      ))}
    </>
  );
};

export default CardList;
