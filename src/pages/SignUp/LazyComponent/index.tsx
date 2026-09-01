'use client';

import React, { useState, useEffect } from 'react';
import styles from '../SignUp.module.scss';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import goBackIcon from '@/assets/icons/go-back.svg';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import {
  setEmail,
  switchSignUpAgreement,
  setFalseSignUpAgreement,
  sendSignUpData,
  clearSignUpSuccessOnly,
  getMe,
} from '@/store/slices/authSlice';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';
import { resolvePostAuthRedirect } from '@/utils/authRedirect';
import {
  PASSWORD_POLICY_HINT,
  validatePasswordPolicy,
} from '@/utils/passwordPolicy';
import {
  completeRegistrationWithPassword,
  peekCompletionToken,
} from '@/api/authApi';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

const validateEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const LazyComponent: React.FC = () => {
  useDocumentSeo({
    title: 'Регистрация',
    description: 'Регистрация в Miraflores',
    canonicalPath: '/sign-up',
    noIndex: true,
  });

  const [pass, setPass] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [resumeMode, setResumeMode] = useState(
    () => typeof window !== 'undefined' && !!peekCompletionToken(),
  );

  const toast = useToast();
  const { email, signUp, isAuth } = useSelector((state: RootState) => state.authSlice);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null) ?? null;

  useEffect(() => {
    dispatch(setFalseSignUpAgreement());
    if (isAuth) {
      navigate(resolvePostAuthRedirect('/', fromState));
    }
    if (resumeMode && !email.trim()) {
      const stored = (localStorage.getItem('email') || '').trim();
      if (stored) dispatch(setEmail(stored));
    }
  }, []);

  const handleNavigatetoHome = () => navigate('/');
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setEmail(value));

    if (emailTouched || value.length > 0) {
      if (value && !validateEmail(value)) {
        setEmailError('Введите корректный email адрес');
      } else {
        setEmailError(null);
      }
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    if (email && !validateEmail(email)) {
      setEmailError('Введите корректный email адрес');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPass(value);

    if (passwordTouched || value.length > 0) {
      setPasswordError(validatePasswordPolicy(value));
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    setPasswordError(validatePasswordPolicy(pass));
  };

  const passwordRequirements = [
    { text: 'Минимум 8 символов', met: pass.length >= 8 },
    { text: 'Хотя бы одна буква', met: /[A-Za-zА-Яа-яЁё]/.test(pass) },
    { text: 'Хотя бы одна цифра', met: /\d/.test(pass) },
  ];

  const handleCompleteResume = async () => {
    const policyError = validatePasswordPolicy(pass);
    const resumeEmail =
      email.trim() ||
      (typeof window !== 'undefined' ? (localStorage.getItem('email') || '').trim() : '');
    if (!validateEmail(resumeEmail)) {
      setEmailTouched(true);
      setEmailError('Введите корректный email адрес');
      setResumeMode(false);
      toast.error('Email не найден. Начните регистрацию заново.');
      return;
    }
    if (policyError) {
      setPasswordTouched(true);
      setPasswordError(policyError);
      return;
    }
    if (!peekCompletionToken()) {
      setResumeMode(false);
      toast.error('Сессия регистрации истекла. Запросите код снова.');
      return;
    }

    setCompleting(true);
    try {
      const result = await completeRegistrationWithPassword(resumeEmail, pass);
      if (result.token) {
        // JWT уже в LS через setAccessToken в completeRegistrationWithPassword
        localStorage.removeItem('email');
      }
      await dispatch(getMe());
      toast.success('Регистрация завершена');
      navigate(resolvePostAuthRedirect('/', fromState));
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Не удалось завершить регистрацию';
      toast.error(translateAuthError(msg));
    } finally {
      setCompleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resumeMode) {
      await handleCompleteResume();
      return;
    }

    const emailValid = validateEmail(email);
    const policyError = validatePasswordPolicy(pass);

    if (!emailValid) {
      setEmailTouched(true);
      setEmailError('Введите корректный email адрес');
      return;
    }

    if (policyError) {
      setPasswordTouched(true);
      setPasswordError(policyError);
      return;
    }

    if (!signUp.agreeChecked) {
      toast.warning('Нужно согласие с офертой и политикой конфиденциальности');
      return;
    }

    try {
      const result = await dispatch(
        sendSignUpData({ email, password: pass, consentMarketing }),
      ).unwrap();
      dispatch(clearSignUpSuccessOnly());
      setPass('');

      if (result?.otpSent) {
        toast.success('Код отправлен на email — подтвердите регистрацию');
        setTimeout(() => navigate('/email-confirmation', { state: fromState }), 400);
      } else {
        toast.warning(
          result?.message ||
            'Если аккаунт уже есть — войдите. Иначе проверьте почту или попробуйте позже.',
        );
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : String((error as { message?: string })?.message ?? '');
      toast.error(translateAuthError(msg));
      if (import.meta.env.DEV) {
        console.error('SignUp error:', error);
      }
    }
  };

  const busy = signUp.loadingStatus || completing;
  const resumeEmailForSubmit =
    email.trim() ||
    (typeof window !== 'undefined' ? (localStorage.getItem('email') || '').trim() : '');
  const canSubmit =
    !busy &&
    !emailError &&
    !passwordError &&
    validateEmail(resumeMode ? resumeEmailForSubmit : email) &&
    !validatePasswordPolicy(pass) &&
    (resumeMode || signUp.agreeChecked);

  return (
    <div className={styles.signUpWrapper}>
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

      {!resumeMode ? (
        <div className={styles.progressBar}>
          <div className={`${styles.step} ${styles.active}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepText}>Регистрация</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepText}>Подтверждение email</span>
          </div>
        </div>
      ) : (
        <div className={styles.progressBar}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepText}>Email</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepText}>Код</span>
          </div>
          <div className={`${styles.step} ${styles.active}`}>
            <span className={styles.stepNumber}>3</span>
            <span className={styles.stepText}>Пароль</span>
          </div>
        </div>
      )}

      <h1 className={styles.title}>
        {resumeMode ? 'Шаг 3 · задайте пароль' : 'Регистрация'}
      </h1>
      {resumeMode ? (
        <p className={styles.resumeBanner}>
          Email подтверждён
          {email ? (
            <>
              {' '}
              (<strong>{email}</strong>)
            </>
          ) : null}
          . Страница обновилась — пароль не сохраняется в браузере, введите его ещё раз,
          чтобы завершить регистрацию.
        </p>
      ) : (
        <p className={styles.login}>
          Уже есть аккаунт?{' '}
          <Link to="/sign-in" className={styles.inlineLink}>
            Войти
          </Link>
        </p>
      )}

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className={styles.textFieldWrapper}>
          {!resumeMode && (
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              error={emailError}
            />
          )}
          <TextField
            label="Пароль"
            type="password"
            autoComplete="new-password"
            value={pass}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            error={passwordError}
            autoFocus={resumeMode}
          />
          <p className={styles.login}>{PASSWORD_POLICY_HINT}</p>

          {pass.length > 0 && (
            <div className={styles.passwordRequirements}>
              {passwordRequirements.map((req, idx) => (
                <p
                  key={idx}
                  className={`${styles.requirement} ${req.met ? styles.met : styles.unmet}`}
                >
                  <span className={styles.checkmark}>{req.met ? '✓' : '○'}</span>
                  {req.text}
                </p>
              ))}
            </div>
          )}
        </div>

        {!resumeMode && (
          <>
            <div className={styles.agrrementWrapper}>
              <input
                id="signup-agree-personal"
                type="checkbox"
                className={styles.checkbox}
                checked={signUp.agreeChecked}
                onChange={() => dispatch(switchSignUpAgreement())}
              />
              <label htmlFor="signup-agree-personal" className={styles.agreementTxt}>
                Нажимая на кнопку «Далее», я соглашаюсь с условиями{' '}
                <Link to="/info/oferta-i-usloviia-polzovaniia" className={styles.agreementLink}>
                  Публичной оферты
                </Link>{' '}
                и выражаю своё согласие на обработку моих персональных данных в соответствии с{' '}
                <Link to="/info/politika-konfidentsialnosti" className={styles.agreementLink}>
                  Политикой конфиденциальности
                </Link>
              </label>
            </div>
            <div className={styles.agrrementWrapper}>
              <input
                id="signup-agree-marketing"
                type="checkbox"
                className={styles.checkbox}
                checked={consentMarketing}
                onChange={(e) => setConsentMarketing(e.target.checked)}
              />
              <label htmlFor="signup-agree-marketing" className={styles.agreementTxt}>
                Хочу получать новости и спецпредложения на email (необязательно)
              </label>
            </div>
          </>
        )}

        <Button
          type="submit"
          text={
            busy
              ? resumeMode
                ? 'Создание...'
                : 'Регистрация...'
              : resumeMode
                ? 'Создать аккаунт'
                : 'Далее'
          }
          disabled={!canSubmit}
        />
      </form>
    </div>
  );
};

export default LazyComponent;
