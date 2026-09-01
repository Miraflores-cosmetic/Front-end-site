import React, { useEffect, useState, useRef } from 'react';
import styles from './EmailConfirmation.module.scss';
import { useLocation, useNavigate } from 'react-router-dom';
import siteLogo from '@/assets/icons/Logo-mira.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { useCountdown } from '@/hooks/useCountdown';
import { confirmEmailRequest } from '@/api/authApi';
import { verifyEmailCode } from '@/services/auth.service';
import { useToast } from '@/components/toast/toast';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { getMe, resetSignUp } from '@/store/slices/authSlice';
import { resolvePostAuthRedirect } from '@/utils/authRedirect';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

/** Синхронно с Nest EMAIL_COOLDOWN_MS (75s). */
const RESEND_COOLDOWN_SEC = 75;
/** Синхронно с Nest OTP_TTL_MS (10 мин). */
const OTP_TTL_MINUTES = 10;

const maskEmail = (email: string): string => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
};

const normalizeOtp = (raw: string): string =>
  raw.replace(/\D/g, '').slice(0, 6);

const EmailConfirmation: React.FC = () => {
  useDocumentSeo({
    title: 'Подтверждение email',
    description: 'Подтверждение регистрации Miraflores',
    canonicalPath: '/email-confirmation',
    noIndex: true,
  });

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = (location.state as { from?: string } | null) ?? null;
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const emailSentRef = useRef(false);

  const { email: emailFromState } = useSelector((state: RootState) => state.authSlice);
  const email = emailFromState || localStorage.getItem('email') || '';

  const { timeLeft, reset, isFinished, formatTime } = useCountdown(RESEND_COOLDOWN_SEC);

  const goAfterAuth = () => {
    navigate(resolvePostAuthRedirect('/', fromState));
  };

  // Nest: аккаунт появляется только после complete — getMe на mount не нужен
  // (и вреден при протухшем JWT в LS).
  useEffect(() => {
    const alreadySent =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem('miraflores.register.otpSent') === email;

    if (!emailSentRef.current && email && !alreadySent) {
      emailSentRef.current = true;
      confirmEmailRequest(email)
        .then((res) => {
          if (res.otpSent) {
            reset();
            toast.success('Письмо с подтверждением отправлено на ваш email');
          } else {
            toast.warning(
              res.message ||
                'Если аккаунт уже есть — войдите. Иначе проверьте почту или попробуйте позже.',
            );
            emailSentRef.current = false;
          }
        })
        .catch((error) => {
          toast.error(error?.message || 'Ошибка при отправке письма подтверждения');
          emailSentRef.current = false;
        });
    } else if (!email) {
      toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
    } else if (alreadySent && !emailSentRef.current) {
      emailSentRef.current = true;
      toast.success('Введите код из письма');
    }
  }, [email]);

  const handleNavigatetoHome = () => navigate('/');

  const handleRequest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const otp = normalizeOtp(code);
    if (otp.length !== 6) {
      toast.error('Введите 6-значный код из письма');
      return;
    }

    setLoading(true);
    try {
      if (!email) {
        toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
        return;
      }

      const result = await verifyEmailCode(email, otp);

      if (result.ok && result.token) {
        // JWT уже в LS через setAccessToken в verifyEmailCode / authApi
        if (result.user?.id) {
          localStorage.setItem('userId', result.user.id);
        }
        localStorage.removeItem('email');
        await dispatch(getMe());
        toast.success('Email успешно подтвержден!');
        setTimeout(() => {
          goAfterAuth();
        }, 1500);
      } else {
        if (result.error?.includes('expired') || result.error?.includes('истек')) {
          toast.error('Код подтверждения истек. Запросите новый код.');
        } else {
          toast.error(result.error || 'Ошибка при подтверждении кода');
        }
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Ошибка при подтверждении кода';
      if (msg.includes('Пароль не найден')) {
        toast.warning(
          'Страница обновлена — пароль нужно ввести снова. Это последний шаг регистрации.',
        );
        navigate('/sign-up', { state: fromState });
        return;
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    dispatch(resetSignUp());
    navigate('/sign-up');
  };

  const handleResendCode = async () => {
    if (!isFinished || resending) return;
    if (!email) {
      toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
      return;
    }

    setResending(true);
    try {
      const res = await confirmEmailRequest(email);
      if (res.otpSent) {
        reset();
        toast.success('Письмо с подтверждением отправлено повторно');
      } else {
        toast.warning(
          res.message ||
            'Слишком частые запросы или аккаунт уже есть. Подождите и попробуйте снова, либо войдите.',
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ошибка при отправке письма';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <section className={styles.confirmationContainer}>
      <div className={styles.confirmationWrapper}>
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

        <h1 className={styles.title}>Подтверждение почты</h1>
        {email && (
          <div className={styles.infoBox}>
            <p className={styles.infoText}>
              Код отправлен на <strong>{maskEmail(email)}</strong>
            </p>
            <p className={styles.infoHint}>
              Код действует {OTP_TTL_MINUTES} минут. Проверьте папку «Спам», если письма нет.
            </p>
          </div>
        )}
        <p className={styles.desc}>Введите 6-значный код из письма.</p>

        <form onSubmit={(e) => void handleRequest(e)} noValidate>
          <div className={styles.textFieldWrapper}>
            <TextField
              label="Код"
              value={code}
              onChange={(e) => setCode(normalizeOtp(e.target.value))}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text') || '';
                setCode(normalizeOtp(text));
              }}
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              enterKeyHint="done"
            />
          </div>

          <div className={styles.countDownWrapper}>
            <div className={styles.top}>
              <p className={styles.topTxt}>
                Не пришел код?{' '}
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={() => void handleResendCode()}
                  disabled={!isFinished || resending}
                >
                  {resending ? 'Отправка...' : 'Отправить еще раз'}
                </button>
              </p>
              {!isFinished && (
                <p className={styles.time} aria-live="polite">
                  через {formatTime(timeLeft)}
                </p>
              )}
            </div>
            <Button
              type="submit"
              text={loading ? 'Проверка...' : 'Подтвердить'}
              disabled={loading || normalizeOtp(code).length !== 6}
            />
            <button type="button" className={styles.changeEmail} onClick={handleChangeEmail}>
              Сменить Email
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EmailConfirmation;
