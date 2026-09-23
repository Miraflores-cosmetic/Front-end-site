import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../OrderSuccess/OrderSuccess.module.scss';
import { payOrder } from '@/api/ordersApi';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';
import {
  buildOrderSuccessReturnUrl,
  writePendingCheckoutOrder,
} from '@/utils/pendingCheckoutOrder';

/**
 * Deep-link из transactional email «ожидает оплаты».
 * payToken в query — осознанный exception (письмо с другого устройства);
 * сразу переносим в sessionStorage и чистим URL (history/Referer).
 */
const OrderPay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const orderId = (searchParams.get('orderId') || '').trim();
    const payToken = (searchParams.get('payToken') || '').trim();
    const orderNumber = (searchParams.get('number') || '').trim();

    // Strip payToken from address bar ASAP.
    if (searchParams.has('payToken')) {
      const next = new URLSearchParams(searchParams);
      next.delete('payToken');
      const qs = next.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
    }

    if (!orderId || !payToken) {
      setError('Ссылка на оплату неполная или устарела. Откройте заказ в личном кабинете.');
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        writePendingCheckoutOrder({
          orderId,
          orderNumber: orderNumber || orderId,
          payToken,
          idempotencyKey:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `email-pay-${Date.now()}`,
          fingerprint: `email-pay:${orderId}`,
        });

        const payResult = await payOrder(orderId, payToken);
        if (payResult.alreadyPaid) {
          window.location.replace(
            buildOrderSuccessReturnUrl({
              orderId: payResult.orderId || orderId,
              orderNumber: String(payResult.number || orderNumber),
            }),
          );
          return;
        }

        const sessionToken = payResult.payToken?.trim() || payToken;
        if (!payResult.confirmationToken) {
          throw new Error('Не получен токен ЮKassa');
        }

        writePendingCheckoutOrder({
          orderId: payResult.orderId || orderId,
          orderNumber: String(payResult.number || orderNumber),
          payToken: sessionToken,
          idempotencyKey:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `email-pay-${Date.now()}`,
          fingerprint: `email-pay:${orderId}`,
          paymentId: payResult.paymentId ?? null,
        });

        setReturnUrl(
          buildOrderSuccessReturnUrl({
            orderId: payResult.orderId || orderId,
            orderNumber: String(payResult.number || orderNumber),
          }),
        );
        setConfirmationToken(payResult.confirmationToken);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : 'Не удалось открыть оплату. Попробуйте из личного кабинета.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  if (confirmationToken) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.content}>
          <h1 className={styles.title}>Оплата заказа</h1>
          <p className={styles.subtitle}>Завершите оплату в виджете ниже.</p>
          <YooKassaWidget
            confirmationToken={confirmationToken}
            returnUrl={returnUrl}
            modal={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.successContainer}>
      <div className={styles.content}>
        {loading ? (
          <>
            <h1 className={styles.title}>Открываем оплату…</h1>
            <p className={styles.subtitle}>Подождите несколько секунд.</p>
          </>
        ) : (
          <>
            <h1 className={`${styles.title} ${styles.titleError}`}>Не удалось оплатить</h1>
            <p className={styles.subtitle}>{error}</p>
            <Link to="/profile?tab=orders" className={styles.buttonPrimary}>
              К заказам
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderPay;
