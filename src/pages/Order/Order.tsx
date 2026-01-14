import React, { useEffect } from 'react';
import styles from './Order.module.scss';
import OrderLeftPart from './left-part/OrderLeftPart';
import OrderRightPart from './right-part/OrderRightPart';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';

const Order: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { me } = useSelector((state: RootState) => state.authSlice);

  // Загружаем данные пользователя при загрузке страницы корзины
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined' && !me) {
      dispatch(getMe()).catch((error: any) => {
        console.error('Error loading user data:', error);
      });
    }
  }, [dispatch, me]);

  return (
    <main className={styles.orderContainer}>
      <OrderLeftPart />
      <OrderRightPart />
    </main>
  );
};

export default Order;
