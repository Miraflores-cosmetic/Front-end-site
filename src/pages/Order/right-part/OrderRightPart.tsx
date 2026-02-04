import React, { useMemo, useState, useEffect } from 'react';
import styles from './OrderRightPart.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import CardList, { OrderProduct } from '../order-components/CardList';
import Sertificate from '../order-components/Sertificate';
import SumDiscount from '../order-components/SumDiscount';
import InfoContent from '../order-components/Info';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { getApplicableGift } from '@/services/applicableGift.service';
import { CHANNEL } from '@/graphql/client';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

const OrderRightPart: React.FC = () => {
  const isTablet = useScreenMatch(956);
  const { lines } = useSelector((state: RootState) => state.checkout);
  const [giftLine, setGiftLine] = useState<OrderProduct | null>(null);

  const subtotal = useMemo(() => {
    if (!lines?.length) return 0;
    return lines.reduce((sum: number, line: any) => sum + (line.price ?? 0) * line.quantity, 0);
  }, [lines]);

  useEffect(() => {
    if (subtotal < 5000) {
      setGiftLine(null);
      return;
    }
    getApplicableGift(subtotal, CHANNEL).then((res) => {
      if (res.applicable && res.variantId && res.productName) {
        setGiftLine({
          variantId: res.variantId,
          title: res.productName,
          size: '',
          thumbnail: normalizeMediaUrl(res.thumbnailUrl || ''),
          quantity: res.quantity ?? 1,
          price: 0,
          oldPrice: null,
          discount: null,
          isGift: true,
        });
      } else {
        setGiftLine(null);
      }
    }).catch(() => setGiftLine(null));
  }, [subtotal]);

  const formattedCartData: OrderProduct[] = useMemo(() => {
    if (!lines) return [];
    const cart: OrderProduct[] = lines.map((line: any) => {
      const price = line.price || 0;
      const oldPrice = line.oldPrice || 0;
      let discountLabel: string | null = null;
      if (oldPrice > price) {
        discountLabel = `${Math.round(((oldPrice - price) / oldPrice) * 100)}`;
      }
      return {
        variantId: line.variantId,
        title: line.title || 'Product',
        size: line.size || '',
        thumbnail: line.thumbnail || '',
        quantity: line.quantity,
        price,
        oldPrice: oldPrice > price ? oldPrice : null,
        discount: discountLabel,
        isGift: false,
      };
    });
    if (giftLine) cart.push(giftLine);
    return cart;
  }, [lines, giftLine]);

  return (
    <>
      {!isTablet && (
        <section className={styles.right}>
          <article className={styles.listWrapper}>
            {/* 2. Pass the WHOLE array to CardList once, do not map here */}
            <CardList cartData={formattedCartData} />

          </article>
          <Sertificate />
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