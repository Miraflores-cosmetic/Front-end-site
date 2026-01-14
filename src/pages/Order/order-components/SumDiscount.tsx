import React, { useMemo } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const SumDiscount = () => {
  const { lines } = useSelector((state: RootState) => state.checkout);
  const { voucherCode, voucherDiscount } = useSelector((state: RootState) => state.checkout);

  // Вычисляем суммы
  const calculations = useMemo(() => {
    if (!lines || lines.length === 0) {
      return {
        totalItems: 0,
        totalPrice: 0,
        totalOldPrice: 0,
        totalDiscount: 0,
        voucherDiscountAmount: voucherDiscount || 0,
        finalPrice: 0
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
    const finalPrice = totalPrice - voucherDiscountAmount;

    return {
      totalItems,
      totalPrice,
      totalOldPrice,
      totalDiscount,
      voucherDiscountAmount,
      finalPrice: Math.max(0, finalPrice)
    };
  }, [lines, voucherDiscount]);

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
    </section>
  );
};

export default SumDiscount;
