import React, { useState } from 'react';
import styles from '../right-part/OrderRightPart.module.scss';
import promocode from '@/assets/icons/promocode.svg';
import add from '@/assets/icons/add.svg';
import minus from '@/assets/icons/minus.svg';
import { TextField } from '@/components/text-field/TextField';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import {
  applyVoucherCode,
  removeVoucherCode,
  setUseReferralWallet,
} from '@/store/slices/checkoutSlice';
import { useToast } from '@/components/toast/toast';
import {
  GIFT_HOLD_APPLIED_TOAST,
  GIFT_HOLD_WILL_RESERVE,
} from '@/utils/giftHoldCopy';
import { useOrderCheckoutOptional } from '../OrderCheckoutContext';
import { MetrikaGoal, reachGoal } from '@/lib/metrika';

const Certificate = () => {
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { voucherCode, voucherKind, useReferralWallet } = useSelector(
    (state: RootState) => state.checkout,
  );
  const isAuth = useSelector((s: RootState) => s.authSlice.isAuth);
  const referralWalletAvailable = useSelector(
    (s: RootState) => s.authSlice.me?.referralWalletAvailable ?? 0,
  );
  const toast = useToast();
  const orderCheckout = useOrderCheckoutOptional();
  const checkoutEmail = orderCheckout?.checkoutEmail?.trim() || '';
  const expanded = Boolean(voucherCode) || isInputOpen;
  const walletAvailable = Math.max(0, Math.floor(referralWalletAvailable || 0));
  // enabled гейтит earn; spend доступен при балансе > 0 и выключенной программе.
  const showWallet = isAuth && walletAvailable > 0;

  const EMAIL_RE =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const handleToggleInput = () => {
    if (voucherCode) {
      dispatch(removeVoucherCode());
      toast.success(voucherKind === 'gift' ? 'Сертификат удалён' : 'Промокод удалён');
    } else {
      const next = !isInputOpen;
      setIsInputOpen(next);
      if (next) reachGoal(MetrikaGoal.promoFieldOpen);
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
        result.voucherKind === 'gift'
          ? GIFT_HOLD_APPLIED_TOAST
          : 'Промокод применён',
      );
    } catch (error: unknown) {
      // RTK unwrap rejects with rejectWithValue string, not Error
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Ошибка при применении кода';
      toast.error(msg || 'Ошибка при применении кода');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <section className={styles.certificateWrapper}>
      {showWallet ? (
        <label className={styles.promoWrapper} style={{ cursor: 'pointer' }}>
          <div className={styles.promoWrapperLeft}>
            <input
              type="checkbox"
              checked={useReferralWallet}
              onChange={(e) => {
                dispatch(setUseReferralWallet(e.target.checked));
                if (e.target.checked && voucherCode) {
                  toast.success('Промокод/сертификат сброшен — нельзя совмещать с реф. балансом');
                }
              }}
              aria-describedby="referral-wallet-hint"
            />
            <p className={styles.promoTxt}>
              Списать реферальный баланс ({walletAvailable.toLocaleString('ru-RU')} ₽)
            </p>
          </div>
        </label>
      ) : null}
      {showWallet ? (
        <p id="referral-wallet-hint" className={styles.giftShippingNote} role="note">
          Нельзя совмещать с промокодом или подарочным сертификатом. Списание резервируется при
          оформлении заказа.
        </p>
      ) : null}

      <button
        type="button"
        className={`${styles.promoWrapper} ${expanded ? styles.promoWrapperOpen : ''}`}
        onClick={handleToggleInput}
        aria-expanded={expanded}
        disabled={useReferralWallet}
        title={
          useReferralWallet
            ? 'Сначала снимите списание реферального баланса'
            : undefined
        }
      >
        <div className={styles.promoWrapperLeft}>
          <img src={promocode} alt="" className={styles.promocode} aria-hidden />
          <p className={styles.promoTxt}>Добавить промокод или сертификат</p>
        </div>
        <span className={styles.promoToggle} aria-hidden>
          <img
            src={expanded ? minus : add}
            alt=""
            className={styles.promoToggleIcon}
          />
        </span>
      </button>

      {isInputOpen && !voucherCode && !useReferralWallet && (
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

      {(isInputOpen || voucherKind === 'gift') && !useReferralWallet && (
        <p className={styles.giftShippingNote} role="note">
          {GIFT_HOLD_WILL_RESERVE}
        </p>
      )}
    </section>
  );
};

export default Certificate;
