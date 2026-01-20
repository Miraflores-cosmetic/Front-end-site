'use client';

import React, { useState, useEffect } from 'react';
import styles from '../SignUp.module.scss';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/icons/Miraflores_logo.svg';
import google from '@/assets/icons/google.svg';
import telegram from '@/assets/icons/telegram.svg';
import { SocialButton } from '@/components/social-button/SocialButton';
import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import goBackIcon from '@/assets/icons/go-back.svg';
import { Eye, EyeClosed } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import {
  setEmail,
  setPass,
  switchSignUpAgreement,
  setFalseSignUpAgreement,
  sendSignUpData,
  sendSignInData
} from '@/store/slices/authSlice';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';

const LazyComponent: React.FC = () => {
  const [isPasswordShowed, setIsPasswordShowed] = useState<boolean>(false);
  const toast = useToast();
  const { email, pass, signUp, isAuth } = useSelector((state: RootState) => state.authSlice);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(setFalseSignUpAgreement());
    if (isAuth) handleNavigatetoHome();
  }, []);

  const handleNavigatetoHome = () => navigate('/');
  const handleSignIn = () => navigate('/sign-in');
  const handleConfirmEmail = () => navigate('/email-confirmation');

  useEffect(() => {
    if (signUp.success) {
      // После успешной регистрации автоматически логиним пользователя,
      // чтобы получить токен для отправки письма подтверждения
      dispatch(sendSignInData({ email, pass })).then((result) => {
        if (sendSignInData.fulfilled.match(result)) {
          toast.success('Успешно зарегистрирован!');
          setTimeout(() => {
            handleConfirmEmail();
          }, 1500);
        } else {
          // Если автологин не удался, всё равно переходим на страницу подтверждения
          toast.success('Успешно зарегистрирован!');
          setTimeout(() => {
            handleConfirmEmail();
          }, 1500);
        }
      });
    }
  }, [signUp.success, email, pass, dispatch]);

  useEffect(() => {
    if (signUp.error) {
      toast.error(translateAuthError(signUp.error.message));
    }
  }, [signUp.error]);

  return (
    <div className={styles.signUpWrapper}>
      <div className={styles.imageWrapper}>
        <div className={styles.goBackIcon}>
          <img src={goBackIcon} alt='go_back_icon' className={''} />
        </div>
        <img src={logo} alt='logo' className={styles.logo} onClick={handleNavigatetoHome} />
      </div>
      <h2 className={styles.title}>Регистрация </h2>
      <p className={styles.login}>
        Уже есть аккаунт? <span onClick={handleSignIn}>Войти</span>
      </p>
      <div className={styles.textFieldWrapper}>
        <TextField label='Email' value={email} onChange={e => dispatch(setEmail(e.target.value))} />
        <div className={styles.password_container}>
          <TextField
            label='Пароль'
            type={isPasswordShowed ? 'text' : 'password'}
            value={pass}
            onChange={e => dispatch(setPass(e.target.value))}
          />
          <div
            className={styles.password_eye}
            onClick={() => setIsPasswordShowed(!isPasswordShowed)}
          >
            {isPasswordShowed ? <Eye /> : <EyeClosed />}
          </div>
        </div>
      </div>
      <div className={styles.agrrementWrapper}>
        <input
          type='checkbox'
          className={styles.checkbox}
          checked={signUp.agreeChecked}
          onChange={e => dispatch(switchSignUpAgreement())}
        />
        <p className={styles.agreementTxt}>
          Нажимая на кнопку «Далее», я соглашаюсь с условиями <span>Публичной оферты</span>и выражаю
          своё согласие на обработку моих персональных данных в соответствии с{' '}
          <span>Политикой конфиденциальности</span>
        </p>
      </div>
      <Button
        text='Далее'
        onClick={() => dispatch(sendSignUpData({ email, pass }))}
        disabled={!signUp.agreeChecked}
      />
    </div>
  );
};

export default LazyComponent;
