import React, { useMemo } from 'react';
import styles from './OrderRightPart.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import CardList, { OrderProduct } from '../order-components/CardList'; // Import the Type
import Sertificate from '../order-components/Sertificate';
import SumDiscount from '../order-components/SumDiscount';
import InfoContent from '../order-components/Info';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';

const OrderRightPart: React.FC = () => {
  const isTablet = useScreenMatch(956);
  // Get raw lines from Redux
  const { lines } = useSelector((state: RootState) => state.checkout);

  // 1. Transform Redux Data to match CardList Interface
  const formattedCartData: OrderProduct[] = useMemo(() => {
    if (!lines) return [];

    return lines.map((line: any) => {
      // Logic to calculate discount % if needed
      const price = line.price || 0;
      const oldPrice = line.oldPrice || 0;

      let discountLabel = null;
      if (oldPrice > price) {
        const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
        discountLabel = `${percent}`; // The CardList adds the % sign
      }

      return {
        variantId: line.variantId,
        title: line.title || 'Product',
        // In Saleor, the variant name is usually the size (e.g. "50ml")
        size: line.size || '',
        thumbnail: line.thumbnail || '',
        quantity: line.quantity,
        price: price,
        oldPrice: oldPrice > price ? oldPrice : null,
        discount: discountLabel,
        isGift: false, // Add logic here if you have gift items
      };
    });
  }, [lines]);
  console.log(formattedCartData)

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