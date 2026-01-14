import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './OrderSuccess.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';
import { completeCheckout } from '@/services/checkout.service';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { clearCart } from '@/store/slices/checkoutSlice';

const OrderSuccess: React.FC = () => {
  const [isCompleting, setIsCompleting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    const completeOrder = async () => {
      try {
        // Получаем checkoutId из localStorage
        const checkoutId = localStorage.getItem('pendingCheckoutId');
        
        if (!checkoutId) {
          console.warn('No pending checkoutId found in localStorage');
          setIsCompleting(false);
          return;
        }

        console.log('Completing checkout on success page:', checkoutId);

        // Завершаем checkout
        const result = await completeCheckout(checkoutId);
        console.log('Checkout completed on success page:', result);

        if (result.success && result.order) {
          console.log('Order created successfully:', {
            id: result.order.id,
            number: result.order.number,
            status: result.order.status,
          });
          
          // Очищаем checkoutId из localStorage
          localStorage.removeItem('pendingCheckoutId');
          localStorage.removeItem('pendingPaymentId');
          localStorage.removeItem('pendingPaymentAmount');
          
          // Очищаем корзину
          dispatch(clearCart());
          
          setIsCompleting(false);
        } else {
          // Если заказ не был создан, но ошибка "Checkout not found", 
          // возможно заказ уже создан (видно в админке)
          if (result.error && result.error.includes('Checkout not found')) {
            console.warn('Checkout not found, but order might already exist. Clearing cart anyway.');
            // Очищаем checkoutId из localStorage
            localStorage.removeItem('pendingCheckoutId');
            localStorage.removeItem('pendingPaymentId');
            localStorage.removeItem('pendingPaymentAmount');
            // Очищаем корзину на всякий случай
            dispatch(clearCart());
            setIsCompleting(false);
          } else {
            throw new Error(result.error || 'Failed to complete checkout');
          }
        }
      } catch (error: any) {
        console.error('Error completing checkout on success page:', error);
        // Если ошибка "Checkout not found", но мы на странице успеха (оплата прошла),
        // значит заказ скорее всего уже создан
        if (error.message && error.message.includes('Checkout not found')) {
          console.warn('Checkout not found error, but payment was successful. Order likely exists.');
          // Очищаем checkoutId из localStorage
          localStorage.removeItem('pendingCheckoutId');
          localStorage.removeItem('pendingPaymentId');
          localStorage.removeItem('pendingPaymentAmount');
          // Очищаем корзину
          dispatch(clearCart());
          setIsCompleting(false);
        } else {
          setError(error.message || 'Ошибка при завершении заказа');
          setIsCompleting(false);
          // Не удаляем checkoutId из localStorage, чтобы можно было повторить попытку
        }
      }
    };

    completeOrder();
  }, [dispatch]);

  return (
    <>
      <Header />
      <main className={styles.successContainer}>
        <div className={styles.content}>
          {isCompleting ? (
            <>
              <h1 className={styles.title}>Обработка заказа...</h1>
              <p className={styles.subtitle}>
                Пожалуйста, подождите
              </p>
            </>
          ) : error ? (
            <>
              <h1 className={styles.title} style={{ color: '#dc2626' }}>
                Ошибка при обработке заказа
              </h1>
              <p className={styles.subtitle} style={{ color: '#dc2626' }}>
                {error}
              </p>
              <p className={styles.subtitle}>
                Пожалуйста, свяжитесь с поддержкой, если оплата была успешной.
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
              <Link to="/profile" className={styles.buttonPrimary}>
                Перейти к заказам
              </Link>
              <Link to="/catalog" className={styles.buttonSecondary}>
                Вернуться в каталог
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default OrderSuccess;

