import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  fetchReferralPublicSettings,
  type ReferralPublicSettings,
} from '@/api/referralApi';
import { getMirafloresReferral } from '@/lib/mirafloresReferral';
import type { RootState } from '@/store/store';
import styles from './MfInviteeBanner.module.scss';

const DISMISS_KEY = 'miraflores.mf.inviteeBanner.dismiss.v1';

function formatRub(n: number): string {
  return `${Math.abs(n).toLocaleString('ru-RU')} ₽`;
}

/** Site-wide banner when ?mf= is active and invitee bonus is on. */
export const MfInviteeBanner: React.FC = () => {
  const location = useLocation();
  const isAuth = useSelector((s: RootState) => s.authSlice.isAuth);
  const [settings, setSettings] = useState<ReferralPublicSettings | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    void fetchReferralPublicSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        /* keep null */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-read LS after SPA navigations that may include ?mf=
  const ref = getMirafloresReferral();
  const bonusOn =
    settings?.enabled === true &&
    settings.inviteeBonusEnabled === true &&
    (settings.inviteeBonusRub ?? 0) > 0;

  if (dismissed || !ref?.code || !bonusOn) return null;
  // Checkout has its own note
  if (location.pathname.startsWith('/order')) return null;
  if (location.pathname.startsWith('/sign-')) return null;

  const rub = formatRub(settings?.inviteeBonusRub ?? 0);
  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <aside className={styles.banner} role="status">
      <p className={styles.text}>
        {isAuth
          ? `Вам бонус ${rub} за первый заказ по приглашению — начислим после оплаты.`
          : `Вам бонус ${rub} за первый заказ. Войдите или зарегистрируйтесь, чтобы получить его.`}
      </p>
      <div className={styles.actions}>
        {!isAuth ? (
          <>
            <Link to="/sign-up" className={styles.link} state={{ from: location.pathname }}>
              Регистрация
            </Link>
            <Link
              to="/sign-in"
              className={styles.linkGhost}
              state={{ from: location.pathname }}
            >
              Войти
            </Link>
          </>
        ) : (
          <Link to="/order" className={styles.link}>
            К оформлению
          </Link>
        )}
        <button type="button" className={styles.dismiss} onClick={dismiss}>
          Скрыть
        </button>
      </div>
    </aside>
  );
};

/** Compact checkout hint under voucher block. */
export const MfInviteeCheckoutHint: React.FC = () => {
  const isAuth = useSelector((s: RootState) => s.authSlice.isAuth);
  const [settings, setSettings] = useState<ReferralPublicSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchReferralPublicSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const ref = getMirafloresReferral();
  const bonusOn =
    settings?.enabled === true &&
    settings.inviteeBonusEnabled === true &&
    (settings.inviteeBonusRub ?? 0) > 0;
  if (!ref?.code || !bonusOn) return null;

  const rub = formatRub(settings?.inviteeBonusRub ?? 0);
  if (isAuth) {
    return (
      <p className={styles.checkoutNote} role="note">
        Бонус {rub} за первый заказ по ссылке друга начислим после оплаты (нужен вход в
        аккаунт — вы уже авторизованы).
      </p>
    );
  }

  return (
    <p className={styles.checkoutNote} role="note">
      Вам бонус {rub} за первый заказ по приглашению —{' '}
      <Link to="/sign-in" state={{ from: '/order' }}>
        войдите
      </Link>{' '}
      или{' '}
      <Link to="/sign-up" state={{ from: '/order' }}>
        зарегистрируйтесь
      </Link>
      , иначе бонус не начислится.
    </p>
  );
};

export default MfInviteeBanner;
