'use client';

import React, { useState, useEffect } from 'react';
import styles from '../SignUp.module.scss';
import { useNavigate } from 'react-router-dom';
import logo from '@/assets/icons/Miraflores_logo.svg';
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

// Email validation function
const validateEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Password validation function
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Минимум 8 символов');
  }
  return { valid: errors.length === 0, errors };
};

const LazyComponent: React.FC = () => {
  const [isPasswordShowed, setIsPasswordShowed] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState<boolean>(false);
  const [passwordTouched, setPasswordTouched] = useState<boolean>(false);
  
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

  // Email validation handlers
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

  // Password validation handlers
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch(setPass(value));
    
    if (passwordTouched || value.length > 0) {
      const validation = validatePassword(value);
      if (!validation.valid) {
        setPasswordError(validation.errors[0]);
      } else {
        setPasswordError(null);
      }
    }
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    const validation = validatePassword(pass);
    if (!validation.valid) {
      setPasswordError(validation.errors[0]);
    } else {
      setPasswordError(null);
    }
  };

  // Password requirements
  const passwordRequirements = [
    { text: 'Минимум 8 символов', met: pass.length >= 8 },
    { text: 'Заглавная буква (рекомендуется)', met: /[A-Z]/.test(pass) },
    { text: 'Строчная буква (рекомендуется)', met: /[a-z]/.test(pass) },
    { text: 'Цифра (рекомендуется)', met: /[0-9]/.test(pass) },
  ];

  // Handle form submission
  const handleSubmit = () => {
    // Validate before submission
    const emailValid = validateEmail(email);
    const passwordValid = validatePassword(pass).valid;

    if (!emailValid) {
      setEmailTouched(true);
      setEmailError('Введите корректный email адрес');
      return;
    }

    if (!passwordValid) {
      setPasswordTouched(true);
      const validation = validatePassword(pass);
      setPasswordError(validation.errors[0]);
      return;
    }

    dispatch(sendSignUpData({ email, pass }));
  };

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
      const errorMessage = translateAuthError(signUp.error.message);
      toast.error(errorMessage);
      
      // Handle case when user already exists - show warning with suggestion
      if (errorMessage.includes('уже зарегистрирован') || signUp.error.message?.includes('already exists')) {
        // User can click on "Войти" link in the UI to navigate to sign in
      }
      
      // Log error in dev mode
      if (import.meta.env.DEV) {
        console.error('SignUp error:', signUp.error);
      }
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
      
      {/* Progress indicator */}
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

      <h2 className={styles.title}>Регистрация </h2>
      <p className={styles.login}>
        Уже есть аккаунт? <span onClick={handleSignIn}>Войти</span>
      </p>
      <div className={styles.textFieldWrapper}>
        <TextField 
          label='Email' 
          value={email} 
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          error={emailError}
        />
        <div className={styles.password_container}>
          <TextField
            label='Пароль'
            type={isPasswordShowed ? 'text' : 'password'}
            value={pass}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            error={passwordError}
          />
          <div
            className={styles.password_eye}
            onClick={() => setIsPasswordShowed(!isPasswordShowed)}
          >
            {isPasswordShowed ? <Eye /> : <EyeClosed />}
          </div>
        </div>
        
        {/* Password requirements */}
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
      <div className={styles.agrrementWrapper}>
        <input
          type='checkbox'
          className={styles.checkbox}
          checked={signUp.agreeChecked}
          onChange={e => dispatch(switchSignUpAgreement())}
        />
        <p className={styles.agreementTxt}>
          Нажимая на кнопку «Далее», я соглашаюсь с условиями <span>Публичной оферты</span> и выражаю
          своё согласие на обработку моих персональных данных в соответствии с{' '}
          <span>Политикой конфиденциальности</span>
        </p>
      </div>
      <Button
        text={signUp.loadingStatus ? 'Регистрация...' : 'Далее'}
        onClick={handleSubmit}
        disabled={!signUp.agreeChecked || signUp.loadingStatus || !!emailError || !!passwordError}
      />
    </div>
  );
};

export default LazyComponent;
