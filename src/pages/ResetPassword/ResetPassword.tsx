import React, { useState, useEffect } from 'react';
import styles from './ResetPassword.module.scss';
import { useNavigate, useSearchParams } from 'react-router-dom';
import logo from '@/assets/icons/Miraflores_logo.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { setPassword } from '@/graphql/queries/auth.service';
import { useToast } from '@/components/toast/toast';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store/store';
import { sendSignInData } from '@/store/slices/authSlice';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [repetedPassword, setRepetedPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      toast.error('Неверная ссылка для сброса пароля');
      navigate('/forgot-password');
    }
  }, [token, navigate, toast]);

  const handleNavigatetoHome = () => navigate('/');
  
  const handleRequest = async () => {
    if (!newPassword.trim()) {
      toast.error('Введите новый пароль');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (newPassword !== repetedPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (!token) {
      toast.error('Неверная ссылка для сброса пароля');
      return;
    }

    setLoading(true);
    try {
      const result = await setPassword(token, newPassword);
      
      if (result.token && result.user) {
        // Сохраняем токены
        localStorage.setItem('token', result.token);
        if (result.refreshToken) {
          localStorage.setItem('refreshToken', result.refreshToken);
        }
        
        toast.success('Пароль успешно изменен!');
        
        // Автоматически входим пользователя
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        toast.error('Ошибка при сбросе пароля');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error?.message || 'Ошибка при сбросе пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <section className={styles.resetContainer}>
      <div className={styles.resetWrapper}>
        <div className={styles.imageWrapper}>
          <img src={logo} alt='logo' className={styles.logo} onClick={handleNavigatetoHome} />
        </div>
        <h2 className={styles.title}>Придумайте пароль</h2>

        <div className={styles.textFieldWrapper}>
          <TextField
            label='Новый пароль'
            type='password'
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            disabled={loading}
          />
          <TextField
            label='Повторите пароль'
            type='password'
            value={repetedPassword}
            onChange={e => setRepetedPassword(e.target.value)}
            disabled={loading}
          />
        </div>
        <Button 
          text={loading ? 'Сохранение...' : 'Далее'} 
          onClick={handleRequest}
          disabled={loading || !newPassword.trim() || !repetedPassword.trim()}
        />
      </div>
    </section>
  );
};

export default ResetPassword;
