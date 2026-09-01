import React, { useState } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import promocode from '@/assets/icons/promocode.svg';
import minus from '@/assets/icons/minus.svg';
import { TextField } from '@/components/text-field/TextField';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { applyVoucherCode, removeVoucherCode } from '@/store/slices/checkoutSlice';
import { useToast } from '@/components/toast/toast';
import { useOrderCheckoutOptional } from '../OrderCheckoutContext';

const Certificate = () => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { voucherCode, voucherKind } = useSelector((state: RootState) => state.checkout);
  const toast = useToast();
  const orderCheckout = useOrderCheckoutOptional();
  const checkoutEmail = orderCheckout?.checkoutEmail?.trim() || '';
  const expanded = Boolean(voucherCode) || isInputOpen;

  const EMAIL_RE =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const handleToggleInput = () => {
    if (voucherCode) {
      dispatch(removeVoucherCode());
      toast.success(voucherKind === 'gift' ? 'Сертификат удалён' : 'Промокод удалён');
    } else {
      setIsInputOpen(!isInputOpen);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      toast.error('Введите промокод или сертификат');
      return;
    }

    if (!EMAIL_RE.test(checkoutEmail)) {
      toast.error('Сначала укажите email в форме оформления');
      return;
    }

    if (isApplying) {
      return;
    }

    setIsApplying(true);
    try {
      const result = await dispatch(
        applyVoucherCode({ code: promoCode.trim(), email: checkoutEmail }),
      ).unwrap();
      setIsInputOpen(false);
      setPromoCode('');
      toast.success(
        result.voucherKind === 'gift' ? 'Сертификат применён' : 'Промокод применён',
      );
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при применении кода');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className={styles.certificateWrapper}>
      <button
        type="button"
        className={`${styles.promoWrapper} ${expanded ? styles.promoWrapperOpen : ''}`}
        onClick={handleToggleInput}
        aria-expanded={expanded}
      >
        <div className={styles.promoWrapperLeft}>
          <img src={promocode} alt="" className={styles.promocode} aria-hidden />
          <p className={styles.promoTxt}>Добавить промокод или сертификат</p>
        </div>
        <span
          className={`${styles.promoToggle} ${expanded ? styles.promoToggleOpen : ''}`}
          aria-hidden
        >
          <img src={minus} alt="" className={styles.minus} />
        </span>
      </button>

      {isInputOpen && !voucherCode && (
        <div className={styles.promoInputWrapper}>
          <TextField
            label="Промокод или сертификат"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleApplyPromo();
            }}
            disabled={isApplying}
          />
          <button
            type="button"
            onClick={handleApplyPromo}
            disabled={isApplying || !promoCode.trim()}
            className={styles.promoApplyBtn}
          >
            {isApplying ? 'Применение...' : 'Применить'}
          </button>
        </div>
      )}

      {voucherCode && <p className={styles.SALE}>{voucherCode}</p>}

      {(isInputOpen || voucherKind === 'gift') && (
        <p className={styles.giftShippingNote} role="note">
          Сертификат списывается только с товаров — доставку не покрывает. Даже при полном
          балансе курьер и платная доставка оплачиваются отдельно. Без оплаты остаётся только
          бесплатная доставка до ПВЗ при сумме товаров от порога.
        </p>
      )}
    </section>
  );
};

export default Certificate;
