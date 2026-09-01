import React, { useState, useEffect } from 'react';
import styles from './InfoContent.module.scss';
import DeliveryProfile from '@/components/delivery-profile/DeliveryProfile';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { useDispatch, useSelector } from 'react-redux';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import { RootState, AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { updateBuyerProfile } from '@/api/authApi';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';
import { TextField } from '@/components/text-field/TextField';
import ChangePasswordModal from '@/components/change-password-modal/ChangePasswordModal';

function getDisplayPhone(me: RootState['authSlice']['me']): string {
  if (!me) return '';
  const defaultAddress = me.addresses?.find(
    a => a.isDefaultBillingAddress || a.isDefaultShippingAddress,
  );
  return me.phone || defaultAddress?.phone || '';
}

function getDisplayBirthday(me: RootState['authSlice']['me']): string {
  return me?.birthday || '';
}

const InfoContent: React.FC = () => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthday: '',
    receiveGreetings: false,
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (me) {
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: getDisplayPhone(me),
        birthday: getDisplayBirthday(me),
        receiveGreetings: me.marketingConsent === true,
      });
    }
  }, [me]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Пожалуйста, заполните имя и фамилию');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateBuyerProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        birthday: formData.birthday || null,
        marketingConsent: formData.receiveGreetings,
      });

      await dispatch(getMe()).unwrap();
      setIsEditing(false);
      dispatch(closeDrawer());
      toast.success('Профиль успешно обновлен');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      if (
        message?.includes('PermissionDenied') ||
        message?.includes('AUTHENTICATED_USER')
      ) {
        toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
      } else {
        toast.error(translateAuthError(message) || 'Ошибка при обновлении профиля');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    if (me) {
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: getDisplayPhone(me),
        birthday: getDisplayBirthday(me),
        receiveGreetings: me.marketingConsent === true,
      });
    }
    setIsEditing(false);
  };

  const phone = getDisplayPhone(me);
  const birthday = getDisplayBirthday(me);
  const receiveGreetings = me?.marketingConsent === true;

  const formatPhone = (value: string) => (value ? value : 'Не указан');

  const formatBirthday = (date: string) => {
    if (!date) return 'Не указана';
    if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      return `${day}.${month}.${year}`;
    }
    return date;
  };

  return (
    <article className={styles.infoContent}>
      <section className={styles.infoTitleWrapper}>
        <p className={styles.infoTitle}>Здравствуйте, {me?.firstName || 'Пользователь'}</p>
      </section>

      <section className={styles.infoAboutWrapper}>
        <header className={styles.aboutHeader}>
          <div>
            <p className={styles.aboutTitle}>Информация о вас</p>
            <p className={styles.aboutHint}>Контакты и данные для заказов и поздравлений</p>
          </div>
          {!isEditing ? (
            <button type="button" className={styles.changeBtn} onClick={() => setIsEditing(true)}>
              Изменить
            </button>
          ) : (
            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.changeBtn}
                onClick={() => void handleSave()}
                disabled={savingProfile}
              >
                {savingProfile ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" className={styles.changeBtnSecondary} onClick={handleCancel}>
                Отмена
              </button>
            </div>
          )}
        </header>

        {isEditing ? (
          <article className={styles.aboutWrapper}>
            <div className={styles.formGrid}>
              <div className={styles.nameInputs}>
                <TextField
                  label="Имя"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                <TextField
                  label="Фамилия"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </div>
              <TextField
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                disabled
              />
              <TextField
                label="Телефон"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
              />
              <TextField
                label="Дата рождения"
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="receiveGreetings"
                  checked={formData.receiveGreetings}
                  onChange={handleChange}
                />
                Получать поздравления с днём рождения
              </label>
            </div>
          </article>
        ) : (
          <article className={styles.aboutWrapper}>
            <dl className={styles.infoGrid}>
              <div className={styles.field}>
                <dt className={styles.label}>ФИО</dt>
                <dd className={styles.value}>
                  {me?.firstName || me?.lastName
                    ? `${me.firstName || ''} ${me.lastName || ''}`.trim()
                    : 'Не указано'}
                </dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>Телефон</dt>
                <dd className={styles.value}>{formatPhone(phone)}</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>Email</dt>
                <dd className={styles.value}>{me?.email || 'Не указано'}</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>Пароль</dt>
                <dd className={styles.valueRow}>
                  <span className={styles.value}>••••••••</span>
                  <button
                    type="button"
                    className={styles.inlineAction}
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Сменить
                  </button>
                </dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>Дата рождения</dt>
                <dd className={styles.value}>{formatBirthday(birthday)}</dd>
              </div>
              <div className={styles.field}>
                <dt className={styles.label}>Получать поздравления?</dt>
                <dd className={styles.value}>{receiveGreetings ? 'Да' : 'Нет'}</dd>
              </div>
            </dl>
          </article>
        )}
      </section>

      <section className={styles.infoAddressWrapper}>
        <section>
          <DeliveryProfile onSelectAddress={() => {}} />
        </section>
      </section>

      <section className={styles.infoSliderWrapper}>
        <p className={styles.title}>КОЕ-ЧТО НОВОЕ ДЛЯ ВАС</p>
        <Bestsellers isTitleHidden slidesToShow={2} isProfilePage />
      </section>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </article>
  );
};

export default InfoContent;
