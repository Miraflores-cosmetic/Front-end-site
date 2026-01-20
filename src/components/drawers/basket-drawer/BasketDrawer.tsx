import React, { useEffect, useState } from 'react';
import styles from './BasketDrawer.module.scss';
import { AppDispatch, RootState } from '@/store/store';
import blackBasketTrash from '@/assets/icons/blackBasketTrash.svg';
import whiteBasketTrash from '@/assets/icons/whiteBasketTrash.svg';
import promocodeIcon from '@/assets/icons/promocode.svg';
import BasketCard from './basket-card/BascetCard';
import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/helpers/helpers';
import { createCheckoutApi, clearCart } from '@/store/slices/checkoutSlice';
import { CHANNEL } from '@/graphql/client';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { getProgressBarCartModel } from '@/graphql/queries/pages.service';

const BasketDrawer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [totalFromPrice, setTotalFromPrice] = React.useState(0);
  const [totalToPrice, setTotalToPrice] = React.useState(0);
  const [progressBar, setProgressBar] = useState({
    contentText: 'до бесплатной доставки',
    threshold: 15780,
    successText: 'Бесплатная доставка!'
  });
  const isMobile = useScreenMatch(664);

  const remainder = Math.max(0, progressBar.threshold - totalToPrice);
  const progressPercent =
    progressBar.threshold > 0 ? Math.min(100, (totalToPrice / progressBar.threshold) * 100) : 0;

  const { lines } = useSelector((state: RootState) => state.checkout);
  const { isAuth, email } = useSelector((state: RootState) => state.authSlice);

  useEffect(() => {
    getProgressBarCartModel().then(setProgressBar).catch(() => {});
  }, []);

  useEffect(() => {
    let totalFrom = 0;
    let totalTo = 0;

    lines.forEach(item => {
      // Используем oldPrice только если он существует и больше текущей цены
      const itemOldPrice = item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price;
      totalFrom += itemOldPrice * item.quantity;
      totalTo += (item.price ?? 0) * item.quantity;
    });

    setTotalFromPrice(totalFrom);
    setTotalToPrice(totalTo);
  }, [lines]);

  const handleOrder = () => {
    dispatch(closeDrawer());

    if (!isAuth) {
      navigate('/sign-in');
      return;
    }

    const adaptedLines = lines.map(line => {
      return {
        variantId: line.variantId,
        quantity: line.quantity
      };
    });

    dispatch(
      createCheckoutApi({
        email: email,
        channel: CHANNEL,
        lines: adaptedLines
      })
    );

    navigate('/order');
  };

  const handleClearCart = () => {
    if (window.confirm('Вы уверены, что хотите очистить корзину?')) {
      dispatch(clearCart());
    }
  };

  return (
    <div className={`${styles.drawer}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.header}>
          <p className={styles.title}>КОРЗИНА</p>
          <button onClick={() => dispatch(closeDrawer())} className={styles.closeTxt}>
            ЗАКРЫТЬ
          </button>
        </div>
        <div className={styles.progresContainer}>
          <p className={styles.progresText}>
            {remainder <= 0
              ? progressBar.successText
              : `${formatCurrency(remainder)}₽ ${progressBar.contentText}`}
          </p>
          <div className={styles.progresTrack}>
            <div className={styles.progresFill} style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className={styles.basketList}>
          {lines.length > 0 ? (
            lines.map((item, idx) => <BasketCard key={idx} {...item} />)
          ) : (
            <p className={styles.sum}>Корзина пуста</p>
          )}
        </div>

        {/* Promo Code Section */}
        <div className={styles.promoSection}>
          <div className={styles.promoRow}>
            <img src={promocodeIcon} alt='promocode' className={styles.promoIcon} />
            <span className={styles.promoText}>Добавить промокод или сертификат</span>
            <span className={styles.promoPlus}>+</span>
          </div>
        </div>
      </div>
      <div className={styles.orderButtonContainer}>
        <div className={styles.footerContent}>
          <div className={styles.totalInfo}>
            <div className={styles.priceRow}>
              <span className={styles.mainPrice}>{formatCurrency(totalToPrice)}₽</span>
              {totalFromPrice > totalToPrice && (
                <span className={styles.oldPrice}>{formatCurrency(totalFromPrice)}₽</span>
              )}
            </div>
            <p className={styles.itemCount}>
              <span className={styles.desktopSumLabel}>Сумма • </span>
              {lines.length}{' '}
              {lines.length === 1
                ? 'товар'
                : lines.length > 1 && lines.length < 5
                  ? 'товара'
                  : 'товаров'}
            </p>
          </div>

          <div className={styles.actions}>
            <button className={styles.orderButtonLeft} onClick={handleOrder}>
              {isAuth ? 'Оформить заказ' : 'Войти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasketDrawer;
