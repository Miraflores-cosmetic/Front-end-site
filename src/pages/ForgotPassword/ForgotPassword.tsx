import React, { useState } from 'react';
import styles from './ForgotPassword.module.scss';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import siteLogo from '@/assets/icons/Logo-mira.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { requestPasswordReset } from '@/api/authApi';
import { useToast } from '@/components/toast/toast';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import type { RootState } from '@/store/store';

function initialForgotEmail(reduxEmail: string): string {
  const fromRedux = reduxEmail?.trim() || '';
  if (fromRedux) return fromRedux;
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem('email') || '').trim();
}

const validateEmail = (email: string): boolean => {
  if (!email?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const ForgotPassword: React.FC = () => {
  useDocumentSeo({
    title: 'Восстановление пароля',
    description: 'Сброс пароля Miraflores',
    canonicalPath: '/forgot-password',
    noIndex: true,
  });

  const reduxEmail = useSelector((state: RootState) => state.authSlice.email);
  const [email, setEmail] = useState(() => initialForgotEmail(reduxEmail));
  const [emailError, setEmailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleNavigatetoHome = () => navigate('/');
  const handleGoSignIn = () => navigate('/sign-in');

  const handleRequest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) {
      setEmailError('Введите email');
      return;
    }
    if (!validateEmail(email)) {
      setEmailError('Введите корректный email адрес');
      return;
    }
    setEmailError(null);

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const res = await requestPasswordReset(email, redirectUrl);
      setSent(true);
      toast.success(
        res.message ||
          'Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.',
      );
      if (import.meta.env.DEV && res.devHint) {
        console.info('[forgot-password] reset link (dev):', res.devHint);
      }
      if (import.meta.env.DEV && res.emailSent === false) {
        console.warn(
          '[forgot-password] письмо не отправлено (нет пользователя / SMTP ошибка). Смотрите лог Nest.',
        );
      }
    } catch (error: unknown) {
      console.error('Error requesting password reset:', error);
      const msg = error instanceof Error ? error.message : 'Ошибка при отправке инструкции';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.forgotContainer}>
      <div className={styles.forgotWrapper}>
        <div className={styles.imageWrapper}>
          <button
            type="button"
            className={styles.logoButton}
            onClick={handleNavigatetoHome}
            aria-label="На главную"
          >
            <img src={siteLogo} alt="" className={styles.logo} />
          </button>
        </div>
        <h1 className={styles.title}>Забыли пароль</h1>
        {sent ? (
          <>
            <p className={styles.desc}>
              Мы отправили ссылку для задания пароля на указанный email.
            </p>
            <p className={styles.desc}>
              Проверьте почту и перейдите по ссылке, чтобы создать пароль для входа.
            </p>
            <div className={styles.sentActions}>
              <Button text="Войти" onClick={handleGoSignIn} />
              <button
                type="button"
                className={styles.secondaryLink}
                onClick={handleNavigatetoHome}
              >
                Вернуться на главную
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={(e) => void handleRequest(e)} noValidate>
            <p className={styles.desc}>
              Введите email — отправим ссылку, чтобы задать или сбросить пароль. Если
              вы покупали у нас раньше, так же задаётся пароль для входа.
            </p>
            <div className={styles.textFieldWrapper}>
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                error={emailError}
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              text={loading ? 'Отправка...' : 'Выслать инструкцию'}
              disabled={loading || !email.trim()}
            />
          </form>
        )}
      </div>
    </section>
  );
};

export default ForgotPassword;
