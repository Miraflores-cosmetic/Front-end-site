import React, { useEffect, useRef, useState } from 'react';
import { changePassword } from '@/api/authApi';
import { TextField } from '@/components/text-field/TextField';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';
import { validatePasswordPolicy } from '@/utils/passwordPolicy';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './ChangePasswordModal.module.scss';

type Props = {
  open: boolean;
  onClose: () => void;
};

const ChangePasswordModal: React.FC<Props> = ({ open, onClose }) => {
  const toast = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  useFocusTrap(open, modalRef, onClose);

  useEffect(() => {
    if (!open) {
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSave = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      toast.error('Заполните старый и новый пароль');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    const policyError = validatePasswordPolicy(passwordData.newPassword);
    if (policyError) {
      toast.error(policyError);
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwordData.oldPassword, passwordData.newPassword);
      onClose();
      toast.success('Пароль изменён — войдите снова');
      localStorage.removeItem('token');
      window.location.href = '/sign-in';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(translateAuthError(message) || 'Ошибка при смене пароля');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
      >
        <div className={styles.header}>
          <h3 id="change-password-title">Сменить пароль</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <TextField
            label="Старый пароль"
            type="password"
            name="oldPassword"
            value={passwordData.oldPassword}
            onChange={handlePasswordChange}
            autoComplete="current-password"
          />
          <TextField
            label="Новый пароль"
            type="password"
            name="newPassword"
            value={passwordData.newPassword}
            onChange={handlePasswordChange}
            autoComplete="new-password"
          />
          <TextField
            label="Подтвердите пароль"
            type="password"
            name="confirmPassword"
            value={passwordData.confirmPassword}
            onChange={handlePasswordChange}
            autoComplete="new-password"
          />
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
