import React from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useOrderCheckoutOptional } from '../OrderCheckoutContext';

const SumDiscount = () => {
  const { voucherCode, voucherKind } = useSelector((state: RootState) => state.checkout);
  const orderCheckout = useOrderCheckoutOptional();
  const payable = orderCheckout?.payable;

  const formatPrice = (price: number) => {
    return Math.round(price).toLocaleString('ru-RU');
  };

  if (!payable) {
    return (
      <section className={styles.sectionSumDiscount}>
        <div className={styles.sumWrapper}>
          <p className={styles.sum}>Товары</p>
          <div className={styles.price}>
            <p className={styles.priceNew}>0₽</p>
          </div>
        </div>
      </section>
    );
  }

  const shippingPending = payable.hasPayableLines && payable.payableTotal == null;
  const displayTotal = shippingPending ? payable.goodsTotal : (payable.payableTotal ?? payable.goodsTotal);
  const sumLabel = shippingPending ? 'Товары' : 'К оплате';

  return (
    <section className={styles.sectionSumDiscount}>
      <div className={styles.sumWrapper}>
        <p className={styles.sum}>
          {sumLabel} • {payable.totalItems}{' '}
          {payable.totalItems === 1
            ? 'товар'
            : payable.totalItems < 5
              ? 'товара'
              : 'товаров'}
        </p>
        <div className={styles.price}>
          <p className={styles.priceNew}>{formatPrice(displayTotal)}₽</p>
          {payable.totalOldPrice > displayTotal && (
            <p className={styles.priceOld}>{formatPrice(payable.totalOldPrice)}₽</p>
          )}
        </div>
      </div>
      {payable.catalogDiscount > 0 && (
        <div className={styles.discountWrapper}>
          <p className={styles.name}>Скидка</p>
          <p className={styles.value}>-{formatPrice(payable.catalogDiscount)}₽</p>
        </div>
      )}
      {voucherCode && payable.voucherDiscount > 0 && (
        <div className={styles.promocodeWrapper}>
          <p className={styles.name}>{voucherKind === 'gift' ? 'Сертификат' : 'Промокод'}</p>
          <p className={styles.value}>-{formatPrice(payable.voucherDiscount)}₽</p>
        </div>
      )}
      {payable.hasPayableLines && (
        <div className={styles.shippingWrapper}>
          <p className={styles.name}>Доставка</p>
          <div className={styles.shippingValueCol}>
            {orderCheckout?.cdekShippingLoading && (
              <p className={styles.shippingValueMuted}>Расчёт…</p>
            )}
            {!orderCheckout?.cdekShippingLoading && orderCheckout?.cdekShippingError && (
              <p className={styles.shippingValueError}>{orderCheckout.cdekShippingError}</p>
            )}
            {!orderCheckout?.cdekShippingLoading &&
              !orderCheckout?.cdekShippingError &&
              payable.shippingRub != null && (
                <p className={styles.shippingValue}>
                  {orderCheckout?.freePvzShippingApplied || payable.shippingRub === 0
                    ? 'бесплатно'
                    : `${formatPrice(payable.shippingRub)}₽`}
                </p>
              )}
            {!orderCheckout?.cdekShippingLoading &&
              !orderCheckout?.cdekShippingError &&
              payable.shippingRub == null &&
              !orderCheckout?.selectedAddress && (
                <p className={styles.shippingValueMuted}>Выберите адрес</p>
              )}
            {!orderCheckout?.cdekShippingLoading &&
              !orderCheckout?.cdekShippingError &&
              payable.shippingRub == null &&
              orderCheckout?.selectedAddress && (
                <p className={styles.shippingValueMuted}>—</p>
              )}
          </div>
        </div>
      )}
      {shippingPending && (
        <div className={styles.shippingWrapper}>
          <p className={styles.name}>К оплате</p>
          <p className={styles.shippingValueMuted}>после расчёта доставки</p>
        </div>
      )}
    </section>
  );
};

export default SumDiscount;
