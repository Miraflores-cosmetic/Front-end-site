import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './BasketDrawer.module.scss';
import { AppDispatch, RootState } from '@/store/store';
import BasketCard from './basket-card/BasketCard';
import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/helpers/helpers';
import { syncCartLines, applyVoucherCode, removeVoucherCode } from '@/store/slices/checkoutSlice';
import { useToast } from '@/components/toast/toast';
import { TextField } from '@/components/text-field/TextField';
import { useProgressBarCartModel } from '@/hooks/useProgressBarCartModel';
import { useApplicableGift } from '@/hooks/useApplicableGift';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M15 5L5 15M5 5l10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BasketDrawer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const toast = useToast();
  const progressBar = useProgressBarCartModel();

  const { lines, voucherCode, voucherDiscount, voucherKind } = useSelector(
    (state: RootState) => state.checkout,
  );
  const activeDrawer = useSelector((state: RootState) => state.drawer.activeDrawer);
  const meEmail = useSelector((state: RootState) => state.authSlice.me?.email);
  const prevDrawerRef = useRef(activeDrawer);

  const { totalFromPrice, totalToPrice } = useMemo(() => {
    let totalFrom = 0;
    let totalTo = 0;
    lines.forEach((item) => {
      const itemOldPrice =
        item.oldPrice && item.oldPrice > item.price ? item.oldPrice : item.price;
      totalFrom += itemOldPrice * item.quantity;
      totalTo += (item.price ?? 0) * item.quantity;
    });
    return { totalFromPrice: totalFrom, totalToPrice: totalTo };
  }, [lines]);

  const giftLine = useApplicableGift(totalToPrice);

  const itemCount = lines.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const finalPrice = Math.max(0, totalToPrice - (voucherDiscount || 0));
  const remainder = Math.max(0, progressBar.threshold - totalToPrice);
  const progressPercent =
    progressBar.threshold > 0
      ? Math.min(100, (totalToPrice / progressBar.threshold) * 100)
      : 0;
  const progressReached = remainder <= 0;

  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | undefined>();
  const [isApplying, setIsApplying] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    setPromoCode(voucherCode || '');
    setPromoError(undefined);
  }, [voucherCode]);

  /** Свежие цены/остаток при открытии корзины (clamp без toast — только removed). */
  useEffect(() => {
    const opened = activeDrawer === 'basket' && prevDrawerRef.current !== 'basket';
    prevDrawerRef.current = activeDrawer;
    if (!opened || lines.length === 0) return;

    let cancelled = false;
    void (async () => {
      try {
        const syncResult = await dispatch(syncCartLines()).unwrap();
        if (cancelled) return;
        const removed = syncResult.removed ?? [];
        if (!removed.length) return;
        const names = removed
          .map((r) => ('name' in r ? r.name : undefined))
          .filter(Boolean)
          .slice(0, 3);
        const oos = removed.some((r) => r.reason === 'oos');
        toast.error(
          names.length
            ? `${oos ? 'Нет в наличии' : 'Недоступны'}: ${names.join(', ')}${
                removed.length > names.length ? '…' : ''
              }`
            : `Убрано из корзины: ${removed.length} поз.`,
        );
      } catch {
        /* тихо — пользователь увидит ошибку при «Оформить» */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDrawer, dispatch, lines.length, toast]);

  const isCartEmpty = lines.length === 0;
  const isOrderDisabled = isOrdering || isCartEmpty;

  const handleClose = () => dispatch(closeDrawer());

  const handleOrder = async () => {
    if (isOrderDisabled) return;

    setIsOrdering(true);
    try {
      const syncResult = await dispatch(syncCartLines()).unwrap();
      const removed = syncResult.removed ?? [];
      if (removed.length) {
        const names = removed
          .map((r) => ('name' in r ? r.name : undefined))
          .filter(Boolean)
          .slice(0, 3);
        const oos = removed.some((r) => r.reason === 'oos');
        toast.error(
          names.length
            ? `${oos ? 'Нет в наличии' : 'Недоступны'}: ${names.join(', ')}${
                removed.length > names.length ? '…' : ''
              }`
            : `Убрано из корзины: ${removed.length} поз. (нет в наличии)`,
        );
        setIsOrdering(false);
        return;
      }
      if (!(syncResult.lines?.length > 0)) {
        toast.error('Корзина пуста');
        setIsOrdering(false);
        return;
      }
      setIsOrdering(false);
      handleClose();
      navigate('/order');
    } catch (error: unknown) {
      setIsOrdering(false);
      const err = error as { payload?: string | { message?: string }; message?: string };
      const payloadMsg =
        typeof err?.payload === 'string'
          ? err.payload
          : typeof err?.payload?.message === 'string'
            ? err.payload.message
            : '';
      toast.error(payloadMsg || err?.message || 'Не удалось обновить корзину');
    }
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoError('Введите промокод или сертификат');
      return;
    }
    const email = meEmail?.trim();
    if (!email) {
      setPromoError('Укажите email в профиле или на странице оформления');
      return;
    }
    if (isApplying) return;
    setIsApplying(true);
    setPromoError(undefined);
    try {
      const result = await dispatch(
        applyVoucherCode({
          code,
          email,
        }),
      ).unwrap();
      toast.success(
        result.voucherKind === 'gift' ? 'Сертификат применён' : 'Промокод применён',
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      setPromoError(msg || 'Ошибка при применении кода');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClearPromo = () => {
    dispatch(removeVoucherCode());
    setPromoCode('');
    setPromoError(undefined);
    toast.success(voucherKind === 'gift' ? 'Сертификат удалён' : 'Промокод удалён');
  };

  return (
    <div className={styles.drawer}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Корзина{itemCount > 0 ? ` (${itemCount})` : ''}
        </h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Закрыть"
        >
          <CloseIcon />
        </button>
      </header>

      {isCartEmpty ? (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Корзина пуста</p>
          <button type="button" className={styles.continueBtn} onClick={handleClose}>
            Продолжить покупки
          </button>
        </div>
      ) : (
        <>
          <div className={styles.progressBlock} aria-live="polite">
            <p className={styles.progressText}>
              {progressReached
                ? progressBar.successText
                : `${formatCurrency(remainder)}₽ ${progressBar.contentText}`}
            </p>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className={styles.progressNote}>
              Бесплатно только до ПВЗ при сумме товаров от порога (без учёта промокода).
              Курьер и другие способы — по тарифу при оформлении.
            </p>
          </div>

          <ul className={styles.list} role="list">
            {lines.map((item) => (
              <li
                key={item.variantId}
                className={styles.listItem}
              >
                <BasketCard {...item} />
              </li>
            ))}
            {giftLine ? (
              <li key={`gift-${giftLine.variantId}`} className={styles.listItem}>
                <BasketCard
                  variantId={giftLine.variantId}
                  title={giftLine.title}
                  thumbnail={giftLine.thumbnail}
                  quantity={giftLine.quantity}
                  price={giftLine.price}
                  isGift
                />
              </li>
            ) : null}
          </ul>

          <footer className={styles.footer}>
            <div className={styles.promoRow}>
              <div className={styles.promoField}>
                <TextField
                  label="Промокод или сертификат"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoError(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleApplyPromo();
                    }
                  }}
                  error={promoError}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={Boolean(voucherCode) || isApplying}
                />
              </div>
              {voucherCode ? (
                <button
                  type="button"
                  className={styles.promoApply}
                  onClick={handleClearPromo}
                  disabled={isApplying}
                >
                  Сбросить
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.promoApply}
                  onClick={() => void handleApplyPromo()}
                  disabled={isApplying}
                >
                  {isApplying ? '…' : 'Применить'}
                </button>
              )}
            </div>

            {voucherDiscount > 0 || totalFromPrice > totalToPrice ? (
              <div className={styles.totals}>
                <div className={styles.totalsRow}>
                  <span>Сумма</span>
                  <span>
                    {formatCurrency(totalFromPrice > totalToPrice ? totalFromPrice : totalToPrice)}₽
                  </span>
                </div>
                {totalFromPrice > totalToPrice ? (
                  <div className={styles.totalsRowMuted}>
                    <span>Скидка</span>
                    <span>−{formatCurrency(totalFromPrice - totalToPrice)}₽</span>
                  </div>
                ) : null}
                {voucherDiscount > 0 ? (
                  <div className={styles.totalsRowMuted}>
                    <span>
                      {voucherKind === 'gift' ? 'Сертификат' : 'Промокод'}
                      {voucherCode ? ` (${voucherCode})` : ''}
                    </span>
                    <span>−{formatCurrency(voucherDiscount)}₽</span>
                  </div>
                ) : null}
                <div className={styles.totalsRowStrong}>
                  <span>Итого</span>
                  <span>{formatCurrency(finalPrice)}₽</span>
                </div>
              </div>
            ) : (
              <div className={styles.subtotalRow}>
                <span>Итого</span>
                <span>{formatCurrency(finalPrice)}₽</span>
              </div>
            )}

            <p className={styles.note}>Доставка рассчитывается при оформлении</p>

            <button
              type="button"
              className={styles.orderButton}
              onClick={() => void handleOrder()}
              disabled={isOrderDisabled}
              aria-busy={isOrdering}
            >
              {isOrdering ? (
                <>
                  <span className={styles.orderButtonLoader} aria-hidden />
                  <span>Обновляем…</span>
                </>
              ) : (
                <span>Оформить и оплатить</span>
              )}
            </button>
          </footer>
        </>
      )}
    </div>
  );
};

export default BasketDrawer;
