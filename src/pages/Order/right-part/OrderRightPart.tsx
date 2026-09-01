import React, { useMemo } from 'react';
import styles from './OrderRightPart.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import CardList, { OrderProduct } from '../order-components/CardList';
import Certificate from '../order-components/Certificate';
import SumDiscount from '../order-components/SumDiscount';
import InfoContent from '../order-components/Info';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { useApplicableGift } from '@/hooks/useApplicableGift';
import { openDrawer } from '@/store/slices/drawerSlice';

const OrderRightPart: React.FC = () => {
  /** Правый блок скрыт на узком экране (ширина меньше порога mobile из useScreenMatch). */
  const hideOrderRightColumn = useScreenMatch();
  const dispatch = useDispatch<AppDispatch>();
  const { lines } = useSelector((state: RootState) => state.checkout);

  const subtotal = useMemo(() => {
    if (!lines?.length) return 0;
    return lines.reduce(
      (sum, line) => sum + (line.isGift ? 0 : (line.price ?? 0) * line.quantity),
      0,
    );
  }, [lines]);

  const giftLine = useApplicableGift(subtotal);

  const formattedCartData: OrderProduct[] = useMemo(() => {
    if (!lines) return [];
    const cart: OrderProduct[] = lines.map((line) => {
      const price = line.price || 0;
      const oldPrice = line.oldPrice || 0;
      let discountLabel: string | null = null;
      if (oldPrice > price) {
        discountLabel = `${Math.round(((oldPrice - price) / oldPrice) * 100)}`;
      }
      return {
        variantId: line.variantId,
        lineKey: line.variantId,
        title: line.title || 'Product',
        size: line.size || '',
        thumbnail: line.thumbnail || '',
        quantity: line.quantity,
        price,
        oldPrice: oldPrice > price ? oldPrice : null,
        discount: discountLabel,
        isGift: Boolean(line.isGift),
      };
    });
    if (giftLine) {
      cart.push({
        variantId: giftLine.variantId,
        lineKey: `${giftLine.variantId}:gift`,
        title: giftLine.title,
        size: '',
        thumbnail: giftLine.thumbnail,
        quantity: giftLine.quantity,
        price: 0,
        oldPrice: null,
        discount: null,
        isGift: true,
      });
    }
    return cart;
  }, [lines, giftLine]);

  return (
    <>
      {!hideOrderRightColumn && (
        <section className={styles.right}>
          <article className={styles.listWrapper}>
            <div className={styles.listHeader}>
              <button
                type="button"
                className={styles.editCartBtn}
                onClick={() => dispatch(openDrawer('basket'))}
              >
                Изменить корзину
              </button>
            </div>
            <CardList cartData={formattedCartData} />
          </article>
          <Certificate />
          <section className={styles.discountPromo}>
            <p>
              Скидка по промо-кодам НЕ РАСПРОСТРАНЯЕТСЯ на товары уже со скидками, наборы, товары не
              нашего производства и электронные продукты.
            </p>
          </section>
          <SumDiscount />
          <InfoContent />
        </section>
      )}
    </>
  );
};

export default OrderRightPart;
