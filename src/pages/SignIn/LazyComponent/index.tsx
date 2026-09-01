'use client';

import React, { useEffect, useState } from 'react';
import styles from '../SignIn.module.scss';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import goBackIcon from '@/assets/icons/go-back.svg';
import {
  setEmail,
  sendSignInData,
  clearSignInSuccess,
  clearSignInError,
  getMe,
} from '@/store/slices/authSlice';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '@/components/toast/toast';
import { RootState, AppDispatch } from '@/store/store';
import { translateAuthError } from '@/utils/translateAuthError';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import { resolvePostAuthRedirect } from '@/utils/authRedirect';

const validateEmail = (email: string): boolean => {
  if (!email?.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const LazyComponent: React.FC = () => {
  useDocumentSeo({
    title: 'Вход',
    description: 'Вход в личный кабинет Miraflores',
    canonicalPath: '/sign-in',
    noIndex: true,
  });

  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null) ?? null;
  const { email, signIn } = useSelector((state: RootState) => state.authSlice);
  const [pass, setPass] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleNavigatetoHome = () => navigate('/');
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  const handleForgotPassword = () => navigate('/forgot-password');

  const goAfterAuth = () => {
    navigate(resolvePostAuthRedirect('/', fromState));
  };

  // Редирект уже авторизованных — только в App.tsx (без дубля тоста).

  useEffect(() => {
    if (signIn.success) {
      toast.success('Вход в аккаунт выполнен!');
      setPass('');
      dispatch(getMe()).catch(() => {});
      goAfterAuth();
      setTimeout(() => {
        dispatch(clearSignInSuccess());
      }, 500);
    }
  }, [signIn.success]);

  useEffect(() => {
    if (signIn.error) {
      toast.error(translateAuthError(signIn.error.message));
      dispatch(clearSignInError());
    }
  }, [signIn.error, dispatch, toast]);

  const canSubmit =
    validateEmail(email) &&
    pass.length > 0 &&
    !emailError &&
    !passwordError &&
    !signIn.loadingStatus;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let ok = true;
    if (!validateEmail(email)) {
      setEmailError('Введите корректный email');
      ok = false;
    } else {
      setEmailError(null);
    }
    if (!pass) {
      setPasswordError('Введите пароль');
      ok = false;
    } else {
      setPasswordError(null);
    }
    if (!ok || signIn.loadingStatus) return;
    void dispatch(sendSignInData({ email, password: pass }));
  };

  return (
    <div className={styles.signInWrapper}>
      <div className={styles.imageWrapper}>
        <button
          type="button"
          className={styles.goBackIcon}
          onClick={handleGoBack}
          aria-label="Назад"
        >
          <img src={goBackIcon} alt="" aria-hidden />
        </button>
        <button
          type="button"
          className={styles.logoButton}
          onClick={handleNavigatetoHome}
          aria-label="На главную"
        >
          <img src={siteLogo} alt="" className={styles.logo} />
        </button>
      </div>
      <h1 className={styles.title}>Вход в аккаунт</h1>
      <p className={styles.login}>
        Впервые у нас?{' '}
        <Link to="/sign-up" className={styles.inlineLink}>
          Зарегистрироваться
        </Link>
      </p>
      <p className={styles.legacyHint}>
        Если покупали у нас ранее — задайте пароль через{' '}
        <button
          type="button"
          className={styles.legacyHintLink}
          onClick={handleForgotPassword}
        >
          «Забыли пароль»
        </button>
      </p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.textFieldWrapper}>
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              dispatch(setEmail(e.target.value));
              if (emailError) setEmailError(null);
            }}
            error={emailError}
          />
          <TextField
            label="Пароль"
            type="password"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            error={passwordError}
            rightLinkText="Забыли?"
            onRightLinkClick={handleForgotPassword}
          />
        </div>
        <Button
          type="submit"
          text={signIn.loadingStatus ? 'Вход...' : 'Войти'}
          disabled={!canSubmit}
        />
      </form>
    </div>
  );
};

export default LazyComponent;
