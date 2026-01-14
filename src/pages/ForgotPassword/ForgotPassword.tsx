import React, { useState } from 'react';
import styles from './ForgotPassword.module.scss';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '@/assets/icons/Miraflores_logo.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { requestPasswordReset } from '@/graphql/queries/auth.service';
import { useToast } from '@/components/toast/toast';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleNavigatetoHome = () => navigate('/');
  
  const handleRequest = async () => {
    if (!email.trim()) {
      toast.error('Введите email');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      await requestPasswordReset(email, redirectUrl);
      setSent(true);
      toast.success('Инструкция по сбросу пароля отправлена на ваш email');
    } catch (error: any) {
      console.error('Error requesting password reset:', error);
      toast.error(error?.message || 'Ошибка при отправке инструкции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.forgotContainer}>
      <div className={styles.forgotWrapper}>
        <div className={styles.imageWrapper}>
          <img src={logo} alt='logo' className={styles.logo} onClick={handleNavigatetoHome} />
        </div>
        <h2 className={styles.title}>Забыли пароль</h2>
        {sent ? (
          <>
            <p className={styles.desc}>
              Мы отправили ссылку для сброса пароля на указанный вами email адрес.
            </p>
            <p className={styles.desc}>
              Пожалуйста, проверьте вашу почту и перейдите по ссылке для создания нового пароля.
            </p>
            <Button text='Вернуться на главную' onClick={handleNavigatetoHome} />
          </>
        ) : (
          <>
            <p className={styles.desc}>
              Введите ваш email адрес, и мы отправим вам ссылку для сброса пароля.
            </p>
            <div className={styles.textFieldWrapper}>
              <TextField 
                label='Email' 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button 
              text={loading ? 'Отправка...' : 'Выслать инструкцию'} 
              onClick={handleRequest}
              disabled={loading || !email.trim()}
            />
          </>
        )}
      </div>
    </section>
  );
};

export default ForgotPassword;
