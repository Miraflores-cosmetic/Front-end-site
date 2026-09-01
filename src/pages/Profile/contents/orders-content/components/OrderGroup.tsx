import React from 'react';
import { orderStatusBadgeClass, orderStatusLabel } from '@/lib/orderStatusLabels';
import {
  orderTrackingProviderLabel,
  orderTrackingUrl,
} from '@/lib/orderTracking';
import CardList, { type CartItem } from './card-list/CardList';
import styles from '../OrdersContent.module.scss';

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const raw = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatRub(amount: number): string {
  return `${Math.round(amount).toLocaleString('ru-RU')} ₽`;
}

function getOrderTotal(order: {
  lines?: { unitPrice?: { gross?: { amount?: number } }; quantity?: number }[];
  total?: { gross?: { amount?: number | string } };
}): number {
  if (order.lines?.length) {
    const fromLines = order.lines.reduce((sum, line) => {
      const unit = Number(line.unitPrice?.gross?.amount ?? 0);
      const qty = line.quantity ?? 1;
      return sum + unit * qty;
    }, 0);
    if (fromLines > 0) return fromLines;
  }
  return Number(order.total?.gross?.amount ?? 0);
}

export type OrderGroupProps = {
  order: {
    id: string;
    number: string | number;
    created: string;
    status?: string;
    statusDisplay?: string;
    lines?: {
      id?: string;
      productName?: string;
      quantity?: number;
      variantName?: string;
      unitPrice?: { gross?: { amount?: number } };
      isGift?: boolean;
      thumbnail?: { url?: string };
      variant?: { product?: { id?: string; thumbnail?: { url?: string } } };
    }[];
    total?: { gross?: { amount?: number | string } };
    tracking?: string | null;
    trackingProvider?: string | null;
  };
  onReview?: (productId: string, productName: string, orderId: string) => void;
  reviewable?: boolean;
};

export function OrderGroup({ order, onReview, reviewable }: OrderGroupProps) {
  const status = order.statusDisplay || order.status;
  const tracking = order.tracking?.trim() || '';
  const trackingHref = tracking ? orderTrackingUrl(order.trackingProvider, tracking) : null;
  const trackingProviderLabel = orderTrackingProviderLabel(order.trackingProvider);
  const cartData: CartItem[] =
    order.lines?.map((line, index) => {
      const unitAmount = line.unitPrice?.gross?.amount ?? 0;
      const qty = line.quantity ?? 1;
      return {
        id: index + 1,
        image: line.thumbnail?.url || line.variant?.product?.thumbnail?.url || '',
        alt: line.productName || '',
        name: line.productName || '',
        size: line.variantName || '',
        count: `${qty} шт.`,
        quantity: qty,
        price: unitAmount * qty,
        isGift: Boolean(line.isGift),
        productId: line.variant?.product?.id,
      };
    }) ?? [];

  return (
    <article className={styles.orderGroup}>
      <header className={styles.orderHead}>
        <div>
          <p className={styles.orderDate}>{formatOrderDate(order.created)}</p>
          <p className={styles.orderNumber}>Заказ №{order.number}</p>
          {tracking ? (
            <p className={styles.orderTracking}>
              {trackingProviderLabel ? `${trackingProviderLabel}: ` : 'Трек: '}
              {trackingHref ? (
                <a
                  href={trackingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.orderTrackingLink}
                >
                  {tracking}
                </a>
              ) : (
                tracking
              )}
            </p>
          ) : null}
        </div>
        <span
          className={`${styles.statusBadge} ${orderStatusBadgeClass(status, styles)}`}
        >
          {orderStatusLabel(status)}
        </span>
      </header>

      <ul className={styles.itemList}>
        <CardList
          asListItems
          cartData={cartData}
          onReview={
            reviewable && onReview
              ? (productId, productName) => onReview(productId, productName, order.id)
              : undefined
          }
        />
      </ul>

      <p className={styles.orderTotal}>
        <span>Итого</span>
        <span>{formatRub(getOrderTotal(order))}</span>
      </p>
    </article>
  );
}
