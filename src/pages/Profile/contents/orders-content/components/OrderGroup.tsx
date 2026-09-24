import React, { useState } from 'react';
import { orderStatusBadgeClass, orderStatusLabel, normalizeOrderStatus } from '@/lib/orderStatusLabels';
import {
  orderTrackingProviderLabel,
  orderTrackingUrl,
} from '@/lib/orderTracking';
import { getOrder } from '@/api/accountApi';
import { payOrder } from '@/api/ordersApi';
import {
  buildOrderSuccessReturnUrl,
  writePendingCheckoutOrder,
} from '@/utils/pendingCheckoutOrder';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';
import { useToast } from '@/components/toast/toast';
import CardList, { type CartItem } from './card-list/CardList';
import styles from '../OrdersContent.module.scss';
import { openOrderChat } from '@/lib/orderChat/orderChatEvents';

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

export type OrderGroupProps = {
  order: {
    id: string;
    number: string | number;
    created: string;
    status?: string;
    statusDisplay?: string;
    canPay?: boolean;
    payToken?: string | null;
    payExpiresAt?: string | null;
    lines?: {
      id?: string;
      productName?: string;
      productType?: string | null;
      quantity?: number;
      variantName?: string;
      unitPrice?: { gross?: { amount?: number } };
      isGift?: boolean;
      thumbnail?: { url?: string };
      variant?: { product?: { id?: string; thumbnail?: { url?: string } } };
    }[];
    total?: { gross?: { amount?: number | string } };
    shippingCost?: number;
    discountTotal?: number;
    giftCertificateAmount?: number;
    tracking?: string | null;
    trackingProvider?: string | null;
  };
  onReview?: (productId: string, productName: string, orderId: string) => void;
  reviewable?: boolean;
  reviewedProductIds?: Set<string>;
  onPaid?: (orderId: string) => void;
  /** Непрочитанные ответы поддержки в чате по заказу. */
  chatUnread?: number;
};

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4.75h14c.69 0 1.25.56 1.25 1.25v9.5c0 .69-.56 1.25-1.25 1.25h-8.5L6 20.25v-3.5H5c-.69 0-1.25-.56-1.25-1.25V6c0-.69.56-1.25 1.25-1.25Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OrderGroup({
  order,
  onReview,
  reviewable,
  reviewedProductIds,
  onPaid,
  chatUnread = 0,
}: OrderGroupProps) {
  const toast = useToast();
  const status = order.statusDisplay || order.status;
  const statusKey = normalizeOrderStatus(status);
  const canPay =
    Boolean(order.canPay) ||
    statusKey === 'AWAITING_PAYMENT' ||
    statusKey === 'NEW';
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
        productType: line.productType?.trim() || null,
        size: line.variantName || '',
        count: `${qty} шт.`,
        quantity: qty,
        price: unitAmount * qty,
        isGift: Boolean(line.isGift),
        productId: line.variant?.product?.id,
      };
    }) ?? [];

  const [paying, setPaying] = useState(false);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState('');

  const handlePay = async () => {
    if (paying) return;
    setPaying(true);
    try {
      let payToken = order.payToken?.trim() || '';
      if (!payToken) {
        const detail = await getOrder(order.id);
        payToken = detail?.payToken?.trim() || '';
      }

      const payResult = await payOrder(order.id, payToken || null);

      if (payResult.alreadyPaid) {
        toast.success('Заказ уже оплачен');
        onPaid?.(order.id);
        return;
      }

      const sessionToken = payResult.payToken?.trim() || payToken;
      if (!sessionToken) {
        throw new Error('Не удалось получить токен оплаты');
      }
      if (!payResult.confirmationToken) {
        throw new Error('Не получен токен ЮKassa');
      }

      const orderNumber = String(payResult.number || order.number);
      writePendingCheckoutOrder({
        orderId: payResult.orderId || order.id,
        orderNumber,
        payToken: sessionToken,
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `ik-${Date.now()}`,
        fingerprint: `account-pay:${order.id}`,
        paymentId: payResult.paymentId ?? null,
      });

      setReturnUrl(
        buildOrderSuccessReturnUrl({
          orderId: payResult.orderId || order.id,
          orderNumber,
        }),
      );
      setConfirmationToken(payResult.confirmationToken);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось начать оплату');
    } finally {
      setPaying(false);
    }
  };

  const openChat = () =>
    openOrderChat({
      selection: {
        kind: 'order',
        orderId: order.id,
        title: `Заказ №${order.number}`,
      },
    });

  const hasBreakdown =
    typeof order.shippingCost === 'number' ||
    (order.discountTotal ?? 0) > 0 ||
    (order.giftCertificateAmount ?? 0) > 0;

  const trackingContent = tracking ? (
    <>
      <span className={styles.trackingChipLabel}>{trackingProviderLabel || 'Трек'}</span>
      <span className={styles.trackingChipCode}>{tracking}</span>
    </>
  ) : null;

  return (
    <article className={styles.orderGroup}>
      <div className={styles.orderGroupMain}>
        <header className={styles.orderHead}>
          <div className={styles.orderHeadInfo}>
            <p className={styles.orderDate}>{formatOrderDate(order.created)}</p>
            <p className={styles.orderNumber}>Заказ №{order.number}</p>
          </div>
          <span className={`${styles.statusBadge} ${orderStatusBadgeClass(status, styles)}`}>
            {orderStatusLabel(status)}
          </span>
        </header>

        {tracking ? (
          trackingHref ? (
            <a
              href={trackingHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.trackingChip}
              title="Открыть отслеживание"
            >
              {trackingContent}
            </a>
          ) : (
            <span className={styles.trackingChip}>{trackingContent}</span>
          )
        ) : null}

        <ul className={styles.itemList}>
          <CardList
            asListItems
            cartData={cartData}
            reviewedProductIds={reviewedProductIds}
            onReview={
              reviewable && onReview
                ? (productId, productName) => onReview(productId, productName, order.id)
                : undefined
            }
          />
        </ul>

        <div className={styles.orderSummary}>
          {hasBreakdown ? (
            <div className={styles.orderBreakdown}>
              {(order.discountTotal ?? 0) > 0 ? (
                <p className={styles.orderBreakdownRow}>
                  <span>Скидка</span>
                  <span>−{formatRub(order.discountTotal ?? 0)}</span>
                </p>
              ) : null}
              {(order.giftCertificateAmount ?? 0) > 0 ? (
                <p className={styles.orderBreakdownRow}>
                  <span>Сертификат</span>
                  <span>−{formatRub(order.giftCertificateAmount ?? 0)}</span>
                </p>
              ) : null}
              {typeof order.shippingCost === 'number' ? (
                <p className={styles.orderBreakdownRow}>
                  <span>Доставка</span>
                  <span>
                    {order.shippingCost === 0 ? 'бесплатно' : formatRub(order.shippingCost)}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
          <p className={styles.orderTotal}>
            <span>Итого</span>
            <span>{formatRub(Number(order.total?.gross?.amount ?? 0))}</span>
          </p>
        </div>

        {canPay && !confirmationToken ? (
          <div className={styles.orderActions}>
            <button
              type="button"
              className={styles.payBtn}
              disabled={paying}
              onClick={() => void handlePay()}
            >
              {paying ? 'Открываем оплату…' : 'Оплатить'}
            </button>
            {order.payExpiresAt ? (
              <p className={styles.payHint}>
                Оплатите до{' '}
                {new Date(order.payExpiresAt).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
          </div>
        ) : null}

        {confirmationToken ? (
          <div className={styles.payWidget}>
            <YooKassaWidget
              confirmationToken={confirmationToken}
              returnUrl={returnUrl}
              onSuccess={() => {
                window.location.href = returnUrl;
              }}
              onError={(err) => {
                toast.error(err?.message || 'Ошибка оплаты');
                setConfirmationToken(null);
              }}
              onClose={() => setConfirmationToken(null)}
            />
            <button
              type="button"
              className={styles.payCancel}
              onClick={() => setConfirmationToken(null)}
            >
              Закрыть оплату
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={`${styles.orderChatBtn} ${chatUnread > 0 ? styles.orderChatBtnUnread : ''}`}
        onClick={openChat}
        aria-label={
          chatUnread > 0
            ? `Чат по заказу №${order.number}, непрочитанных: ${chatUnread}`
            : `Чат по заказу №${order.number}`
        }
      >
        <span className={styles.orderChatIcon}>
          <ChatIcon />
          {chatUnread > 0 ? (
            <span className={styles.orderChatBadge} aria-hidden>
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          ) : null}
        </span>
        <span className={styles.orderChatLabel}>Чат по заказу</span>
        <span className={styles.orderChatChevron}>
          <ChevronIcon />
        </span>
      </button>
    </article>
  );
}
