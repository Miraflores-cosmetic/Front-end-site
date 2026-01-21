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
import { createCheckoutApi, clearCart, applyVoucherCode, removeVoucherCode } from '@/store/slices/checkoutSlice';
import { CHANNEL } from '@/graphql/client';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { getProgressBarCartModel } from '@/graphql/queries/pages.service';
import { useToast } from '@/components/toast/toast';

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

  const { lines, voucherCode, voucherDiscount } = useSelector((state: RootState) => state.checkout);
  const { isAuth, email } = useSelector((state: RootState) => state.authSlice);

  // Итоговая цена с учётом скидки от промокода
  const finalPrice = Math.max(0, totalToPrice - (voucherDiscount || 0));

  const [isPromoInputOpen, setIsPromoInputOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getProgressBarCartModel().then(setProgressBar).catch(() => { });
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

  const handleTogglePromoInput = () => {
    if (voucherCode) {
      dispatch(removeVoucherCode());
      toast.success('Промокод удален');
    } else {
      setIsPromoInputOpen(!isPromoInputOpen);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Введите промокод');
      return;
    }

    if (isApplying) return;

    setIsApplying(true);
    try {
      await dispatch(applyVoucherCode(promoCode.trim())).unwrap();
      setIsPromoInputOpen(false);
      setPromoCode('');
      toast.success('Промокод применен');
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при применении промокода');
    } finally {
      setIsApplying(false);
    }
  };

  const handlePromoKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyPromo();
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
          <div className={styles.promoRow} onClick={handleTogglePromoInput}>
            <img src={promocodeIcon} alt='promocode' className={styles.promoIcon} />
            <span className={styles.promoText}>
              {voucherCode ? 'Промокод применен' : 'Добавить промокод или сертификат'}
            </span>
            <span className={styles.promoPlus}>{voucherCode ? '−' : (isPromoInputOpen ? '−' : '+')}</span>
          </div>

          {isPromoInputOpen && !voucherCode && (
            <div className={styles.promoInputWrapper}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                onKeyPress={handlePromoKeyPress}
                placeholder="Введите промокод"
                className={styles.promoInput}
                disabled={isApplying}
              />
              <button
                onClick={handleApplyPromo}
                disabled={isApplying || !promoCode.trim()}
                className={styles.promoApplyBtn}
              >
                {isApplying ? '...' : 'Применить'}
              </button>
            </div>
          )}

          {voucherCode && (
            <p className={styles.appliedPromo}>{voucherCode}</p>
          )}
        </div>
      </div>
      <div className={styles.orderButtonContainer}>
        <div className={styles.footerContent}>
          <div className={styles.totalInfo}>
            <div className={styles.priceRow}>
              <span className={styles.mainPrice}>{formatCurrency(finalPrice)}₽</span>
              {(totalFromPrice > finalPrice || voucherDiscount > 0) && (
                <span className={styles.oldPrice}>{formatCurrency(totalToPrice)}₽</span>
              )}
            </div>
            {voucherDiscount > 0 && (
              <p className={styles.discountInfo}>Скидка по промокоду: -{formatCurrency(voucherDiscount)}₽</p>
            )}
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
