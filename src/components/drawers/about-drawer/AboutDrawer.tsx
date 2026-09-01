import React, { useState, useEffect } from 'react';
import styles from './AboutDrawer.module.scss';

import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Input } from './components/input-profile/Input';
import { AppDispatch, RootState } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { updateBuyerProfile } from '@/api/authApi';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';
import ChangePasswordModal from '@/components/change-password-modal/ChangePasswordModal';

const AboutDrawer: React.FC = () => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [receiveGreetings, setReceiveGreetings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setFirstName(me.firstName || '');
    setLastName(me.lastName || '');
    setEmail(me.email || '');
    setPhone(me.phone || '');
    setBirthday(me.birthday || '');
    setReceiveGreetings(me.marketingConsent === true);
  }, [me]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Пожалуйста, заполните имя и фамилию');
      return;
    }

    setSaving(true);
    try {
      await updateBuyerProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        birthday: birthday || null,
        marketingConsent: receiveGreetings,
      });

      await dispatch(getMe()).unwrap();

      toast.success('Профиль успешно обновлен');
      dispatch(closeDrawer());
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      toast.error(translateAuthError(message) || 'Ошибка при обновлении профиля');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.drawer}>
      <div className={styles.contentWrapper}>
        <header className={styles.headerWrapper}>
          <div>
            <p className={styles.aboutUs}>Информация о вас</p>
            <p className={styles.aboutHint}>Контакты и данные для заказов и поздравлений</p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={() => dispatch(closeDrawer())}
            aria-label="Закрыть"
          >
            ЗАКРЫТЬ
          </button>
        </header>
        <article className={styles.infoWrapper}>
          <section className={styles.fieldGroup}>
            <p className={styles.groupLabel}>Личные данные</p>
            <Input label="Имя" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <Input
              label="Фамилия"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
            <Input
              label="Дата рождения"
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
            />
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={receiveGreetings}
                onChange={e => setReceiveGreetings(e.target.checked)}
              />
              <span>Получать поздравления с днём рождения</span>
            </label>
          </section>
          <section className={styles.fieldGroup}>
            <p className={styles.groupLabel}>Контакты и доступ</p>
            <Input label="Email" value={email} onChange={() => {}} disabled />
            <Input
              label="Телефон"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <Input
              label="Пароль"
              type="password"
              value="••••••••"
              onChange={() => {}}
              buttonText="Сменить"
              onButtonClick={() => setShowPasswordModal(true)}
            />
          </section>
        </article>
      </div>
      <div className={styles.buttonWrapper}>
        <button
          type="button"
          className={styles.orderButton}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};

export default AboutDrawer;
