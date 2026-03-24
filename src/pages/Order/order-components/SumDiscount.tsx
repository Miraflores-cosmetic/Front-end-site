import React, { useMemo } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useOrderCheckoutOptional } from '../OrderCheckoutContext';

const SumDiscount = () => {
  const { lines } = useSelector((state: RootState) => state.checkout);
  const { voucherCode, voucherDiscount } = useSelector((state: RootState) => state.checkout);
  const orderCheckout = useOrderCheckoutOptional();

  const calculations = useMemo(() => {
    if (!lines || lines.length === 0) {
      return {
        totalItems: 0,
        totalPrice: 0,
        totalOldPrice: 0,
        totalDiscount: 0,
        voucherDiscountAmount: voucherDiscount || 0,
        shippingRub: null as number | null,
        shippingLoading: false,
        shippingError: null as string | null,
        hasPayableLines: false,
        addressSelected: false,
        finalPrice: 0,
      };
    }

    let totalPrice = 0;
    let totalOldPrice = 0;
    let totalItems = 0;

    lines.forEach((line: any) => {
      const quantity = line.quantity || 0;
      const price = line.price || 0;
      const oldPrice = line.oldPrice || 0;

      totalItems += quantity;
      totalPrice += price * quantity;
      totalOldPrice += (oldPrice > price ? oldPrice : price) * quantity;
    });

    const totalDiscount = totalOldPrice - totalPrice;
    const voucherDiscountAmount = voucherDiscount || 0;
    const hasPayableLines = lines.some((line: any) => !line.isGift);
    const shippingRub = orderCheckout?.cdekShippingRub ?? null;
    const shippingLoading = orderCheckout?.cdekShippingLoading ?? false;
    const shippingError = orderCheckout?.cdekShippingError ?? null;
    const addressSelected = Boolean(orderCheckout?.selectedAddress);

    const shippingIncluded =
      hasPayableLines && !shippingLoading && shippingRub != null && !shippingError;
    const shippingAmount = shippingIncluded ? shippingRub : 0;

    const finalPrice = Math.max(0, totalPrice - voucherDiscountAmount + shippingAmount);

    return {
      totalItems,
      totalPrice,
      totalOldPrice,
      totalDiscount,
      voucherDiscountAmount,
      shippingRub,
      shippingLoading,
      shippingError,
      hasPayableLines,
      addressSelected,
      finalPrice,
    };
  }, [lines, voucherDiscount, orderCheckout]);

  const formatPrice = (price: number) => {
    return Math.round(price).toLocaleString('ru-RU');
  };

  return (
    <section className={styles.sectionSumDiscount}>
      <div className={styles.sumWrapper}>
        <p className={styles.sum}>Сумма • {calculations.totalItems} {calculations.totalItems === 1 ? 'товар' : calculations.totalItems < 5 ? 'товара' : 'товаров'}</p>
        <div className={styles.price}>
          <p className={styles.priceNew}>{formatPrice(calculations.finalPrice)}₽</p>
          {calculations.totalOldPrice > calculations.finalPrice && (
            <p className={styles.priceOld}>{formatPrice(calculations.totalOldPrice)}₽</p>
          )}
        </div>
      </div>
      {calculations.totalDiscount > 0 && (
        <div className={styles.discountWrapper}>
          <p className={styles.name}>Скидка</p>
          <p className={styles.value}>-{formatPrice(calculations.totalDiscount)}₽</p>
        </div>
      )}
      {voucherCode && calculations.voucherDiscountAmount > 0 && (
        <div className={styles.promocodeWrapper}>
          <p className={styles.name}>Промокод</p>
          <p className={styles.value}>-{formatPrice(calculations.voucherDiscountAmount)}₽</p>
        </div>
      )}
      {calculations.hasPayableLines && (
        <div className={styles.shippingWrapper}>
          <p className={styles.name}>Доставка</p>
          <div className={styles.shippingValueCol}>
            {calculations.shippingLoading && (
              <p className={styles.shippingValueMuted}>Расчёт…</p>
            )}
            {!calculations.shippingLoading && calculations.shippingError && (
              <p className={styles.shippingValueError}>{calculations.shippingError}</p>
            )}
            {!calculations.shippingLoading &&
              !calculations.shippingError &&
              calculations.shippingRub != null && (
                <p className={styles.shippingValue}>{formatPrice(calculations.shippingRub)}₽</p>
              )}
            {!calculations.shippingLoading &&
              !calculations.shippingError &&
              calculations.shippingRub == null &&
              !calculations.addressSelected && (
                <p className={styles.shippingValueMuted}>Выберите адрес</p>
              )}
            {!calculations.shippingLoading &&
              !calculations.shippingError &&
              calculations.shippingRub == null &&
              calculations.addressSelected && (
                <p className={styles.shippingValueMuted}>—</p>
              )}
          </div>
        </div>
      )}
    </section>
  );
};

export default SumDiscount;
