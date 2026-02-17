'use client'

import React, { useState, useEffect } from 'react';
import styles from '../SignIn.module.scss';
import { Eye, EyeClosed } from 'lucide-react';
import logo from '@/assets/icons/Miraflores_logo.svg';
import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import goBackIcon from '@/assets/icons/go-back.svg';
import { setEmail, setPass, sendSignInData, setFalseSignIiStatus } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useToast } from '@/components/toast/toast';
import { RootState, AppDispatch } from '@/store/store';
import { translateAuthError } from '@/utils/translateAuthError';

const LazyComponent: React.FC = () => {
  const [isPasswordShowed, setIsPasswordShowed] = useState<boolean>(false);
  const toast = useToast();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { email, pass, signIn, isAuth } = useSelector((state: RootState) => state.authSlice);

  const handleNavigatetoHome = () => navigate('/');
  const handleSignUp = () => navigate('/sign-up');
  const handleForgotPassword = () => navigate('/forgot-password');

  // Редирект + предупреждение только если открыли страницу входа уже авторизованным (не после только что выполненного входа)
  useEffect(() => {
    if (isAuth && !signIn.success) {
      toast.warning('Вы уже вошли в систему');
      handleNavigatetoHome();
    }
  }, [isAuth, signIn.success]);

  useEffect(() => {
    if (signIn.success) {
      toast.success('Вход в аккаунт выполнен!');
      setTimeout(() => {
        handleNavigatetoHome();
      }, 1500);
      setTimeout(() => {
        dispatch(setFalseSignIiStatus());
      }, 2000);
    }
  }, [signIn.success]);

  useEffect(() => {
    if (signIn.error) {
      toast.error(translateAuthError(signIn.error.message));
    }
  }, [signIn.error]);

  return (
    <div className={styles.signInWrapper}>
      <div className={styles.imageWrapper}>
        <div className={styles.goBackIcon}>
          <img src={goBackIcon} alt='go_back_icon' className={''} />
        </div>
        <img src={logo} alt='logo' className={styles.logo} onClick={handleNavigatetoHome} />
      </div>
      <h2 className={styles.title}>Вход в аккаунт</h2>
      <p className={styles.login}>
        Впервые у нас? <span onClick={handleSignUp}>Зарегистрироваться</span>
      </p>
      <div className={styles.textFieldWrapper}>
        <TextField label='Email' value={email} onChange={e => dispatch(setEmail(e.target.value))} />
        <div className={styles.password_container}>
          <TextField
            label='Пароль'
            type={isPasswordShowed ? 'text' : 'password'}
            value={pass}
            onChange={e => dispatch(setPass(e.target.value))}
            rightLinkText='Забыли?'
            onRightLinkClick={handleForgotPassword}
          />
          <div
            className={
              pass.length > 0 ? styles.password_eye + ' show' : styles.password_eye + ' hide'
            }
            onClick={() => setIsPasswordShowed(!isPasswordShowed)}
          >
            {isPasswordShowed ? <Eye /> : <EyeClosed />}
          </div>
        </div>
      </div>
      <Button text='Войти' onClick={() => dispatch(sendSignInData({ email, pass }))} />
    </div>
  );
};

export default LazyComponent;
