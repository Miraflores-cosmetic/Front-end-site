import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import styles from './BonusContent.module.scss';

interface BonusContentProps {
  onCloseAccordion?: () => void;
}

const BonusContent: React.FC<BonusContentProps> = ({ onCloseAccordion }) => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch();

  const giftCardsCount = me?.giftCards?.totalCount ?? 0;
  const ordersCount = me?.orders?.totalCount ?? 0;

  return (
    <article className={styles.bonusContent}>
      <h2 className={styles.title}>Бонусный счёт</h2>

      <section className={styles.block}>
        <p className={styles.label}>Подарочные сертификаты</p>
        <p className={styles.value}>{giftCardsCount}</p>
      </section>

      <section className={styles.block}>
        <p className={styles.label}>Всего заказов</p>
        <p className={styles.value}>{ordersCount}</p>
      </section>

      {isMobile && onCloseAccordion && (
        <button type='button' className={styles.closeBtn} onClick={onCloseAccordion}>
          Закрыть
        </button>
      )}
    </article>
  );
};

export default BonusContent;
