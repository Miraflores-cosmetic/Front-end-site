import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from '../OrderSuccess/OrderSuccess.module.scss';
import { getCheckoutStatus, payOrder } from '@/api/ordersApi';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';
import YandexPayButton from '@/components/yandex-pay/YandexPayButton';
import {
  buildOrderSuccessReturnUrl,
  writePendingCheckoutOrder,
} from '@/utils/pendingCheckoutOrder';

/**
 * Deep-link из transactional email «ожидает оплаты».
 * payToken в query — осознанный exception (письмо с другого устройства);
 * сразу переносим в sessionStorage и чистим URL (history/Referer).
 *
 * Bootstrap: checkout-status (total / paid) → mount YaPay;
 * payOrder (ЮKassa) — best-effort, не блокирует кнопку Яндекс Пэй.
 */
const OrderPay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [yooError, setYooError] = useState<string | null>(null);
  const [yooBusy, setYooBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(
    null,
  );
  const [returnUrl, setReturnUrl] = useState('');
  const [payCtx, setPayCtx] = useState<{
    orderId: string;
    orderNumber: string;
    payToken: string;
    total: number;
  } | null>(null);

  async function startYooKassa(ctx: {
    orderId: string;
    orderNumber: string;
    payToken: string;
  }) {
    setYooBusy(true);
    setYooError(null);
    try {
      const payResult = await payOrder(ctx.orderId, ctx.payToken);
      if (payResult.alreadyPaid) {
        window.location.replace(
          buildOrderSuccessReturnUrl({
            orderId: payResult.orderId || ctx.orderId,
            orderNumber: String(payResult.number || ctx.orderNumber),
          }),
        );
        return;
      }

      const sessionToken = payResult.payToken?.trim() || ctx.payToken;
      writePendingCheckoutOrder({
        orderId: payResult.orderId || ctx.orderId,
        orderNumber: String(payResult.number || ctx.orderNumber),
        payToken: sessionToken,
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `email-pay-${Date.now()}`,
        fingerprint: `email-pay:${ctx.orderId}`,
        paymentId: payResult.paymentId ?? null,
      });

      setPayCtx((prev) =>
        prev
          ? {
              ...prev,
              payToken: sessionToken,
              total:
                typeof payResult.total === 'number' &&
                Number.isFinite(payResult.total)
                  ? Math.round(payResult.total)
                  : prev.total,
            }
          : prev,
      );

      if (payResult.confirmationToken) {
        setConfirmationToken(payResult.confirmationToken);
      } else {
        setYooError(
          'Карта / СБП временно недоступны — можно оплатить через Яндекс Пэй.',
        );
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : 'Не удалось открыть оплату картой / СБП.';
      setYooError(`${msg} Доступен Яндекс Пэй.`);
    } finally {
      setYooBusy(false);
    }
  }

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
      setError(
        'Ссылка на оплату неполная или устарела. Откройте заказ в личном кабинете.',
      );
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

        // Без создания PENDING ЮKassa: total + alreadyPaid.
        const status = await getCheckoutStatus(orderId, payToken);
        const resolvedOrderId = status.orderId || orderId;
        const resolvedNumber = String(status.number || orderNumber || orderId);
        const successUrl = buildOrderSuccessReturnUrl({
          orderId: resolvedOrderId,
          orderNumber: resolvedNumber,
        });

        if (status.paid) {
          window.location.replace(successUrl);
          return;
        }

        if (
          status.orderStatus &&
          status.orderStatus !== 'AWAITING_PAYMENT' &&
          status.orderStatus !== 'NEW'
        ) {
          setError(
            status.message ||
              (status.orderStatus === 'CANCELLED'
                ? 'Заказ отменён.'
                : 'Заказ нельзя оплатить в текущем статусе.'),
          );
          return;
        }

        const total = Math.max(0, Math.round(Number(status.total) || 0));
        setReturnUrl(successUrl);
        const ctx = {
          orderId: resolvedOrderId,
          orderNumber: resolvedNumber,
          payToken,
          total,
        };
        setPayCtx(ctx);

        // ЮKassa — отдельно; падение не прячет Яндекс Пэй.
        await startYooKassa(ctx);
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

  const addressClarification =
    Boolean(error) && /оператор уточняет адрес/i.test(error || '');

  if (payCtx) {
    const showYaPay = payCtx.total > 0;
    const showYoo = Boolean(confirmationToken);
    return (
      <div className={styles.successContainer}>
        <div className={styles.content}>
          <h1 className={styles.title}>Оплата заказа</h1>
          <p className={styles.subtitle}>
            {payCtx.orderNumber ? `Заказ ${payCtx.orderNumber}. ` : ''}
            {showYaPay || showYoo
              ? 'Выберите способ оплаты.'
              : 'Способы оплаты временно недоступны.'}
          </p>
          {showYaPay ? (
            <YandexPayButton
              orderId={payCtx.orderId}
              payToken={payCtx.payToken}
              totalAmount={payCtx.total}
              onExclusiveStart={() => {
                // Nest гасит PENDING ЮKassa — виджет с этим token больше невалиден.
                setConfirmationToken(null);
              }}
              onAlreadyPaid={() => {
                window.location.replace(returnUrl);
              }}
              onError={(msg) => setError(msg)}
            />
          ) : null}
          {showYoo ? (
            <>
              {showYaPay ? (
                <p
                  className={styles.subtitle}
                  style={{ marginTop: 8, marginBottom: 12, opacity: 0.75 }}
                >
                  или картой / СБП
                </p>
              ) : null}
              <YooKassaWidget
                confirmationToken={confirmationToken!}
                returnUrl={returnUrl}
                modal={false}
              />
            </>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {yooError ? (
                <p
                  className={styles.subtitle}
                  style={{ opacity: 0.85 }}
                  role="status"
                >
                  {yooError}
                </p>
              ) : showYaPay ? (
                <p className={styles.subtitle} style={{ opacity: 0.75 }}>
                  Выбран Яндекс Пэй. Можно вернуться к карте / СБП без
                  перезагрузки.
                </p>
              ) : null}
              <button
                type="button"
                className={styles.buttonPrimary}
                disabled={yooBusy}
                onClick={() => void startYooKassa(payCtx)}
              >
                {yooBusy ? 'Открываем…' : 'Оплатить картой / СБП'}
              </button>
            </div>
          )}
          {error ? (
            <p className={styles.subtitle} role="alert">
              {error}
            </p>
          ) : null}
          {!showYaPay && !showYoo ? (
            <Link to="/profile?tab=orders" className={styles.buttonPrimary}>
              К заказам
            </Link>
          ) : null}
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
            <h1 className={`${styles.title} ${styles.titleError}`}>
              {addressClarification
                ? 'Оплата пока недоступна'
                : 'Не удалось оплатить'}
            </h1>
            <p className={styles.subtitle}>
              {addressClarification ? 'Оператор уточняет адрес' : error}
            </p>
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
