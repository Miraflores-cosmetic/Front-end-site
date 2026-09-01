import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Order.module.scss';
import OrderLeftPart from './left-part/OrderLeftPart';
import OrderRightPart from './right-part/OrderRightPart';
import { OrderCheckoutProvider } from './OrderCheckoutContext';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { useToast } from '@/components/toast/toast';

const ORDER_TITLE = 'Оформление заказа — Miraflores';
const ORDER_ROBOTS = 'noindex,nofollow';

const Order: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const { lines, hydrated } = useSelector((state: RootState) => state.checkout);
  const didRedirectEmpty = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && !me) {
      dispatch(getMe()).catch((error: unknown) => {
        console.error('Error loading user data:', error);
      });
    }
  }, [dispatch, me]);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = ORDER_TITLE;

    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let createdRobots = false;
    const prevRobots = robots?.getAttribute('content');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
      createdRobots = true;
    }
    robots.setAttribute('content', ORDER_ROBOTS);

    return () => {
      document.title = prevTitle;
      if (!robots) return;
      if (createdRobots) {
        robots.remove();
      } else if (prevRobots != null) {
        robots.setAttribute('content', prevRobots);
      } else {
        robots.removeAttribute('content');
      }
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!lines.length && !didRedirectEmpty.current) {
      didRedirectEmpty.current = true;
      toast.error('Корзина пуста');
      navigate('/catalog', { replace: true });
    }
  }, [hydrated, lines.length, navigate, toast]);

  if (!hydrated) {
    return (
      <div className={styles.orderPage}>
        <main className={styles.orderContainer}>
          <p className={styles.loadingShell}>Загрузка…</p>
        </main>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className={styles.orderPage}>
        <main className={styles.orderContainer}>
          <p className={styles.loadingShell}>Загрузка…</p>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.orderPage}>
      <main className={styles.orderContainer}>
        <OrderCheckoutProvider>
          <OrderLeftPart />
          <OrderRightPart />
        </OrderCheckoutProvider>
      </main>
    </div>
  );
};

export default Order;
