import React, { useEffect, useState, useRef } from 'react';
import styles from './EmailConfirmation.module.scss';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '@/assets/icons/Miraflores_logo.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { useCountdown } from '@/hooks/useCountdown';
import { confirmEmailRequest, confirmAccount } from '@/graphql/queries/auth.service';
import { verifyEmailCode } from '@/services/auth.service';
import { useToast } from '@/components/toast/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';

const EmailConfirmation: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const emailSentRef = useRef(false); // Флаг для предотвращения повторной отправки

  const token = searchParams.get('token');

  useEffect(() => {
    // Если есть токен в URL, автоматически подтверждаем аккаунт
    if (token) {
      handleConfirmWithToken(token);
    } else {
      // Отправляем код подтверждения при загрузке страницы через REST API (не требует авторизации)
      // Защита от повторной отправки (React StrictMode вызывает useEffect дважды в dev)
      if (!emailSentRef.current) {
        emailSentRef.current = true;
        const email = localStorage.getItem('email');
        if (email) {
          confirmEmailRequest(email).then((res) => {
            console.log('Confirmation email sent:', res);
            toast.success('Письмо с подтверждением отправлено на ваш email');
          }).catch((error) => {
            console.error('Error sending confirmation email:', error);
            toast.error(error?.message || 'Ошибка при отправке письма подтверждения');
            emailSentRef.current = false; // Разрешаем повторную попытку при ошибке
          });
        } else {
          toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
        }
      }
    }
  }, [token]);

  const handleConfirmWithToken = async (confirmToken: string) => {
    setLoading(true);
    try {
      const result = await confirmAccount(confirmToken);
      if (result.user) {
        toast.success('Email успешно подтвержден!');
        // Обновляем данные пользователя
        await dispatch(getMe());
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error confirming account:', error);
      toast.error(error?.message || 'Ошибка при подтверждении email');
    } finally {
      setLoading(false);
    }
  };

  // используем хук обратного отсчёта (3 минуты = 180 секунд)
  const { timeLeft, reset, isFinished, formatTime } = useCountdown(180);

  const handleNavigatetoHome = () => navigate('/');
  
  const handleRequest = async () => {
    if (!code.trim()) {
      toast.error('Введите код подтверждения');
      return;
    }

    // Если есть токен в URL, используем его (старый способ через ссылку)
    if (token) {
      await handleConfirmWithToken(token);
      return;
    }

    // Иначе используем код через REST API
    setLoading(true);
    try {
      const email = localStorage.getItem('email');
      if (!email) {
        toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
        setLoading(false);
        return;
      }

      const result = await verifyEmailCode(email, code.trim());
      
      if (result.ok && result.token) {
        // Сохраняем токены
        localStorage.setItem('token', result.token);
        localStorage.setItem('refreshToken', result.refreshToken || '');
        if (result.user?.id) {
          localStorage.setItem('userId', result.user.id);
        }
        
        // Обновляем данные пользователя
        await dispatch(getMe());
        
        toast.success('Email успешно подтвержден!');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error(result.error || 'Ошибка при подтверждении кода');
      }
    } catch (error: any) {
      console.error('Error verifying email code:', error);
      toast.error(error?.message || 'Ошибка при подтверждении кода');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    navigate('/sign-up');
  };

  const handleResendCode = async () => {
    // REST API не требует авторизации, только email
    const email = localStorage.getItem('email');
    if (!email) {
      toast.error('Email не найден. Пожалуйста, зарегистрируйтесь снова.');
      return;
    }

    try {
      await confirmEmailRequest(email);
      reset(); // сброс таймера после повторной отправки
      toast.success('Письмо с подтверждением отправлено повторно');
    } catch (error: any) {
      toast.error(error?.message || 'Ошибка при отправке письма');
    }
  };

  return (
    <section className={styles.confirmationContainer}>
      <div className={styles.confirmationWrapper}>
        <div className={styles.imageWrapper}>
          <img src={logo} alt='logo' className={styles.logo} onClick={handleNavigatetoHome} />
        </div>

        <h2 className={styles.title}>Подтверждение почты</h2>
        <p className={styles.desc}>
          Мы отправили 'Одноразовый код доступа' на указанный вами бизнес-адрес электронной почты.
        </p>

        <div className={styles.textFieldWrapper}>
          <TextField label='Код' value={code} onChange={e => setCode(e.target.value)} />
        </div>

        <div className={styles.countDownWrapper}>
          <div className={styles.top}>
            <p className={styles.topTxt}>
              Не пришел код? <span onClick={handleResendCode}>Отправить еще раз</span>
            </p>
            <p className={styles.time}>{formatTime(timeLeft)}</p>
          </div>
          <Button text='Подтвердить' onClick={handleRequest} disabled={loading} />
          <p className={styles.changeEmail} onClick={handleChangeEmail}>
            Сменить Email
          </p>
          {isFinished && <p className={styles.expired}>Код истёк</p>}
        </div>
      </div>
    </section>
  );
};

export default EmailConfirmation;
