import React, { useState, useEffect, useRef } from 'react';
import styles from './ResetPassword.module.scss';
import { useNavigate, useSearchParams } from 'react-router-dom';
import siteLogo from '@/assets/icons/Logo-mira.svg';

import { TextField } from '@/components/text-field/TextField';
import { Button } from '@/components/button/Button';
import { setPassword } from '@/api/authApi';
import { useToast } from '@/components/toast/toast';
import {
  PASSWORD_POLICY_HINT,
  validatePasswordPolicy,
} from '@/utils/passwordPolicy';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

const ResetPassword: React.FC = () => {
  useDocumentSeo({
    title: 'Новый пароль',
    description: 'Установка нового пароля Miraflores',
    canonicalPath: '/reset-password',
    noIndex: true,
  });

  const [newPassword, setNewPassword] = useState('');
  const [repeatedPassword, setRepeatedPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const missingTokenHandled = useRef(false);

  const token =
    (searchParams.get('token') || searchParams.get('t') || '').trim() || null;

  useEffect(() => {
    if (token || missingTokenHandled.current) return;
    missingTokenHandled.current = true;
    toast.error('Неверная ссылка для сброса пароля');
    navigate('/forgot-password');
  }, [token, navigate, toast]);

  const handleNavigatetoHome = () => navigate('/');

  const passwordRequirements = [
    { text: 'Минимум 8 символов', met: newPassword.length >= 8 },
    { text: 'Хотя бы одна буква', met: /[A-Za-zА-Яа-яЁё]/.test(newPassword) },
    { text: 'Хотя бы одна цифра', met: /\d/.test(newPassword) },
  ];

  const handleRequest = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newPassword.trim()) {
      toast.error('Введите новый пароль');
      return;
    }

    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      setPasswordError(policyError);
      toast.error(policyError);
      return;
    }

    if (newPassword !== repeatedPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (!token) {
      toast.error('Неверная ссылка для сброса пароля');
      return;
    }

    setLoading(true);
    try {
      await setPassword(token, newPassword);
      toast.success('Пароль успешно изменен! Войдите с новым паролем.');
      setTimeout(() => {
        navigate('/sign-in');
      }, 1500);
    } catch (error: unknown) {
      console.error('Error resetting password:', error);
      const msg = error instanceof Error ? error.message : 'Ошибка при сбросе пароля';
      toast.error(msg);
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
          <button
            type="button"
            className={styles.logoButton}
            onClick={handleNavigatetoHome}
            aria-label="На главную"
          >
            <img src={siteLogo} alt="" className={styles.logo} />
          </button>
        </div>
        <h1 className={styles.title}>Придумайте пароль</h1>

        <form onSubmit={(e) => void handleRequest(e)} noValidate>
          <div className={styles.textFieldWrapper}>
            <TextField
              label="Новый пароль"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={() => setPasswordError(validatePasswordPolicy(newPassword))}
              error={passwordError}
              disabled={loading}
            />
            <p className={styles.hint}>{PASSWORD_POLICY_HINT}</p>
            {newPassword.length > 0 && (
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
            <TextField
              label="Повторите пароль"
              type="password"
              autoComplete="new-password"
              value={repeatedPassword}
              onChange={(e) => setRepeatedPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            text={loading ? 'Сохранение...' : 'Далее'}
            disabled={loading || !newPassword.trim() || !repeatedPassword.trim()}
          />
        </form>
      </div>
    </section>
  );
};

export default ResetPassword;
