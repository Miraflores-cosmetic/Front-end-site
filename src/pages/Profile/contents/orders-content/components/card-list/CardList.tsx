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
  reviewedProductIds?: Set<string>;
  asListItems?: boolean;
}

function OrderLineItem({
  item,
  onReview,
  reviewedProductIds,
}: {
  item: CartItem;
  onReview?: (productId: string, productName: string) => void;
  reviewedProductIds?: Set<string>;
}) {
  const qty = item.quantity ?? (parseInt(item.count, 10) || 1);
  const alreadyReviewed = Boolean(item.productId && reviewedProductIds?.has(item.productId));

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
        {onReview && item.productId && !item.isGift && !alreadyReviewed ? (
          <button
            type="button"
            className={styles.reviewButton}
            onClick={() => onReview(item.productId!, item.name)}
          >
            Оставить отзыв
          </button>
        ) : alreadyReviewed ? (
          <span className={styles.reviewPending}>На модерации</span>
        ) : null}
      </div>
    </div>
  );
}

const CardList: React.FC<OrderCartListProps> = ({
  cartData,
  onReview,
  reviewedProductIds,
  asListItems,
}) => {
  if (asListItems) {
    return (
      <>
        {cartData.map(item => (
          <li key={item.id} className={styles.listItem}>
            <OrderLineItem
              item={item}
              onReview={onReview}
              reviewedProductIds={reviewedProductIds}
            />
          </li>
        ))}
      </>
    );
  }

  return (
    <>
      {cartData.map(item => (
        <OrderLineItem
          key={item.id}
          item={item}
          onReview={onReview}
          reviewedProductIds={reviewedProductIds}
        />
      ))}
    </>
  );
};

export default CardList;
