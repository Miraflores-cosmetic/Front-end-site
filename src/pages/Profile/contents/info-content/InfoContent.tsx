import React, { useState, useEffect } from 'react';
import styles from './InfoContent.module.scss';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import { closeDrawer } from '@/store/slices/drawerSlice';
import telegram from '@/assets/icons/telegram.svg';
import { useDispatch, useSelector } from 'react-redux';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import { RootState, AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { updateAccountWithMetadata, changePassword } from '@/graphql/queries/auth.service';
import { useToast } from '@/components/toast/toast';
import { translateAuthError } from '@/utils/translateAuthError';

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
    receiveGreetings: false
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Извлекаем данные из metadata
  const getMetadataValue = (key: string): string => {
    if (!me?.metadata) return '';
    const item = me.metadata.find(m => m.key === key);
    return item?.value || '';
  };

  useEffect(() => {
    if (me) {
      // Телефон пробуем взять из адреса по умолчанию или из metadata
      const defaultAddress = me.addresses?.find(a => a.isDefaultBillingAddress || a.isDefaultShippingAddress);
      const phoneFromAddress = defaultAddress?.phone || '';
      const phoneFromMeta = getMetadataValue('phone');

      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: phoneFromMeta || phoneFromAddress || '',
        birthday: getMetadataValue('birthday') || '',
        receiveGreetings: getMetadataValue('receiveGreetings') === 'true'
      });
    }
  }, [me]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
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
      await updateAccountWithMetadata({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        birthday: formData.birthday.trim(),
        receiveGreetings: formData.receiveGreetings
      });

      await dispatch(getMe()).unwrap();
      setIsEditing(false);
      dispatch(closeDrawer());
      toast.success('Профиль успешно обновлен');
    } catch (error: any) {
      console.error('Update account error:', error);
      if (
        error?.message?.includes('PermissionDenied') ||
        error?.message?.includes('AUTHENTICATED_USER')
      ) {
        toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
      } else {
        toast.error(translateAuthError(error?.message) || 'Ошибка при обновлении профиля');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword) {
      toast.error('Заполните старый и новый пароль');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Пароль должен быть не менее 8 символов');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(passwordData.oldPassword, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Пароль успешно изменен');
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(translateAuthError(error?.message) || 'Ошибка при смене пароля');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCancel = () => {
    if (me) {
      const defaultAddress = me.addresses?.find(a => a.isDefaultBillingAddress || a.isDefaultShippingAddress);
      const phoneFromAddress = defaultAddress?.phone || '';
      const phoneFromMeta = getMetadataValue('phone');

      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || '',
        phone: phoneFromMeta || phoneFromAddress || '',
        birthday: getMetadataValue('birthday') || '',
        receiveGreetings: getMetadataValue('receiveGreetings') === 'true'
      });
    }
    setIsEditing(false);
  };

  const handleAddressSelect = () => {
    // setAddress('Москва');
  };

  // Форматирование телефона для отображения
  const formatPhone = (phone: string) => {
    if (!phone) return 'Не указан';
    return phone;
  };

  // Форматирование даты для отображения
  const formatBirthday = (date: string) => {
    if (!date) return 'Не указана';
    // Если формат YYYY-MM-DD, преобразуем в DD.MM.YYYY
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
        <article className={styles.about}>
          <p className={styles.aboutTitle}>Информация о вас</p>
          {!isEditing && (
            <button className={styles.changeBtn} onClick={() => setIsEditing(true)}>
              <p>Изменить</p>
            </button>
          )}
          {isEditing && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className={styles.changeBtn} onClick={handleSave} disabled={savingProfile}>
                <p>{savingProfile ? 'Сохранение...' : 'Сохранить'}</p>
              </button>
              <button className={styles.changeBtn} onClick={handleCancel}>
                <p>Отмена</p>
              </button>
            </div>
          )}
        </article>

        {isEditing ? (
          <article className={styles.aboutWrapper}>
            <div className={styles.formGrid}>
              <div className={styles.wrapper}>
                <p className={styles.name}>ФИО</p>
                <div className={styles.nameInputs}>
                  <input
                    type='text'
                    name='firstName'
                    value={formData.firstName}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder='Имя'
                  />
                  <input
                    type='text'
                    name='lastName'
                    value={formData.lastName}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder='Фамилия'
                  />
                </div>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Телефон</p>
                <input
                  type='tel'
                  name='phone'
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder='+7 (___) ___-__-__'
                />
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Email</p>
                <input
                  type='email'
                  name='email'
                  value={formData.email}
                  className={styles.input}
                  disabled
                />
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Дата рождения</p>
                <input
                  type='date'
                  name='birthday'
                  value={formData.birthday}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.wrapper}>
                <label className={styles.checkboxLabel}>
                  <input
                    type='checkbox'
                    name='receiveGreetings'
                    checked={formData.receiveGreetings}
                    onChange={handleChange}
                  />
                  <span>Получать поздравления</span>
                </label>
              </div>
            </div>
          </article>
        ) : (
          <article className={styles.aboutWrapper}>
            <div className={styles.infoGrid}>
              <div className={styles.wrapper}>
                <p className={styles.name}>ФИО</p>
                <p className={styles.value}>
                  {me?.firstName || me?.lastName
                    ? `${me.firstName || ''} ${me.lastName || ''}`.trim()
                    : 'Не указано'}
                </p>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Телефон</p>
                <p className={styles.value}>{formatPhone(formData.phone)}</p>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Email</p>
                <p className={styles.value}>{me?.email || 'Не указано'}</p>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Пароль</p>
                <p className={styles.value}>••••••••</p>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Дата рождения</p>
                <p className={styles.value}>{formatBirthday(formData.birthday)}</p>
              </div>
              <div className={styles.wrapper}>
                <p className={styles.name}>Получать поздравления?</p>
                <p className={styles.value}>{formData.receiveGreetings ? 'Да' : 'Нет'}</p>
              </div>
            </div>
            <button
              className={styles.passwordBtn}
              onClick={() => setShowPasswordModal(true)}
            >
              Сменить пароль
            </button>
          </article>
        )}
      </section>

      <section className={styles.infoAddressWrapper}>
        <section>
          <DeliveryProfile onSelectAddress={handleAddressSelect} />
        </section>
      </section>

      <section className={styles.infoBotWrapper}>
        <a
          href='#'
          className={styles.telegramBot}
          onClick={e => {
            e.preventDefault();
          }}
        >
          <img src={telegram} alt={telegram} className={styles.telegramIcon} />
          <p className={styles.telegramBotText}>Наш бот в Телеграме</p>
        </a>
        <p className={styles.telegramBotTextSuccess}>Вы успешно авторизованы!</p>
      </section>

      <section className={styles.infoSliderWrapper}>
        <p className={styles.title}>КОЕ-ЧТО НОВОЕ ДЛЯ ВАС</p>
        <Bestsellers isTitleHidden slidesToShow={2} />
      </section>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPasswordModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Сменить пароль</h3>
              <button onClick={() => setShowPasswordModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Старый пароль</label>
                <input
                  type='password'
                  name='oldPassword'
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  placeholder='Введите старый пароль'
                />
              </div>
              <div className={styles.modalField}>
                <label>Новый пароль</label>
                <input
                  type='password'
                  name='newPassword'
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder='Введите новый пароль'
                />
              </div>
              <div className={styles.modalField}>
                <label>Подтвердите пароль</label>
                <input
                  type='password'
                  name='confirmPassword'
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder='Подтвердите новый пароль'
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.saveBtn}
                onClick={handlePasswordSave}
                disabled={savingPassword}
              >
                {savingPassword ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowPasswordModal(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default InfoContent;
