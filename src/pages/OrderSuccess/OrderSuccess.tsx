import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styles from './OrderSuccess.module.scss';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { clearCart } from '@/store/slices/checkoutSlice';
import { getCheckoutStatus, getPaymentStatus } from '@/api/ordersApi';
import {
  clearPendingCheckoutOrder,
  PENDING_ORDER_ID_KEY,
  PENDING_PAYMENT_ID_KEY,
  PENDING_PAY_TOKEN_KEY,
} from '@/utils/pendingCheckoutOrder';

const OrderSuccess: React.FC = () => {
  const [isCompleting, setIsCompleting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        // payToken только из sessionStorage этой вкладки (не query — history/Referer/logs).
        // Другая вкладка/браузер без session не подтвердит: guest cross-device
        // без query-token осознанно невозможен (см. pendingCheckoutOrder).
        const orderId =
          searchParams.get('orderId') ||
          sessionStorage.getItem(PENDING_ORDER_ID_KEY) ||
          '';
        const payToken = sessionStorage.getItem(PENDING_PAY_TOKEN_KEY) || '';
        const paymentId = sessionStorage.getItem(PENDING_PAYMENT_ID_KEY);

        // Strip legacy payToken from URL if present (share/bookmark safety).
        if (searchParams.has('payToken')) {
          const next = new URLSearchParams(searchParams);
          next.delete('payToken');
          const qs = next.toString();
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`,
          );
        }

        if (paymentId && payToken) {
          const payStatus = await getPaymentStatus(paymentId, payToken);
          if (payStatus.paid) {
            dispatch(clearCart());
            clearPendingCheckoutOrder();
            setIsCompleting(false);
            return;
          }
        }

        if (orderId) {
          if (!payToken) {
            setError(
              'Не удалось подтвердить оплату в этой вкладке (токен только в session браузера, где оформляли заказ). Если деньги списались — проверьте письмо с заказом или зайдите в профиль.',
            );
            setIsCompleting(false);
            return;
          }
          for (let i = 0; i < 8; i++) {
            const status = await getCheckoutStatus(orderId, payToken);
            if (status.paid) {
              dispatch(clearCart());
              clearPendingCheckoutOrder();
              setIsCompleting(false);
              return;
            }
            await new Promise((r) => setTimeout(r, 1500));
          }
          setError(
            'Оплата ещё не подтверждена. Если деньги списались — подождите пару минут и обновите страницу.',
          );
          setIsCompleting(false);
          return;
        }

        setError('Не найден номер заказа для проверки оплаты.');
        setIsCompleting(false);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Ошибка при проверке оплаты');
        setIsCompleting(false);
      }
    };

    void confirmPayment();
  }, [dispatch, searchParams]);

  return (
    <>
      <main className={styles.successContainer}>
        <div className={styles.content}>
          {isCompleting ? (
            <>
              <h1 className={styles.title}>Обработка заказа...</h1>
              <p className={styles.subtitle}>Пожалуйста, подождите</p>
            </>
          ) : error ? (
            <>
              <h1 className={styles.title} style={{ color: '#dc2626' }}>
                Ошибка при обработке заказа
              </h1>
              <p className={styles.subtitle} style={{ color: '#dc2626' }}>
                {error}
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Спасибо, ваш заказ принят.</h1>
              <p className={styles.subtitle}>
                Мы свяжемся с вами в ближайшее время для подтверждения заказа.
              </p>
            </>
          )}

          {!isCompleting && !error && (
            <div className={styles.buttons}>
              <Link to="/profile?tab=orders" className={styles.buttonPrimary}>
                Перейти к заказам
              </Link>
              <Link to="/catalog" className={styles.buttonSecondary}>
                Вернуться в каталог
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default OrderSuccess;
