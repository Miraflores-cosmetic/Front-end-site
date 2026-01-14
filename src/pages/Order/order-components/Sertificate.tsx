import React, { useState } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import promocode from '@/assets/icons/promocode.svg';
import minus from '@/assets/icons/minus.svg';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { applyVoucherCode, removeVoucherCode } from '@/store/slices/checkoutSlice';
import { useToast } from '@/components/toast/toast';

const Sertificate = () => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { voucherCode } = useSelector((state: RootState) => state.checkout);
  const toast = useToast();

  const handleToggleInput = () => {
    if (voucherCode) {
      // Если промокод применен, удаляем его
      dispatch(removeVoucherCode());
      toast.success('Промокод удален');
    } else {
      setIsInputOpen(!isInputOpen);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Введите промокод');
      return;
    }

    // Проверяем, не применяется ли уже промокод
    if (isApplying) {
      return;
    }

    setIsApplying(true);
    try {
      await dispatch(applyVoucherCode(promoCode.trim())).unwrap();
      setIsInputOpen(false);
      setPromoCode('');
      toast.success('Промокод применен');
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при применении промокода');
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyPromo();
    }
  };

  return (
    <section className={styles.sertificatWrapper}>
      <div className={styles.promoWrapper} onClick={handleToggleInput} style={{ cursor: 'pointer' }}>
        <div className={styles.promoWrapperLeft}>
          <img src={promocode} alt={'promocode'} className={styles.promocode} />
          <p className={styles.promoTxt}>Добавить промокод или сертификат</p>
        </div>
        <img src={minus} alt={'minus'} className={styles.minus} />
      </div>
      
      {isInputOpen && !voucherCode && (
        <div className={styles.promoInputWrapper}>
          <input
            type="text"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите промокод"
            className={styles.promoInput}
            disabled={isApplying}
          />
          <button
            onClick={handleApplyPromo}
            disabled={isApplying || !promoCode.trim()}
            className={styles.promoApplyBtn}
          >
            {isApplying ? 'Применение...' : 'Применить'}
          </button>
        </div>
      )}

      {voucherCode && (
        <p className={styles.SALE}>{voucherCode}</p>
      )}
    </section>
  );
};

export default Sertificate;
