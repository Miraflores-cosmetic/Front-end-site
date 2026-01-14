import React, { useState, useEffect } from 'react';
import styles from './InfoContent.module.scss';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import { openDrawer, closeDrawer } from '@/store/slices/drawerSlice';
import telegram from '@/assets/icons/telegram.svg';
import { useDispatch, useSelector } from 'react-redux';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import krem from '@/assets/images/krem.webp';
import girlwithsmile from '@/assets/images/girlsmile.webp';
import { RootState, AppDispatch } from '@/store/store';
import { updateAccountAction, getMe } from '@/store/slices/authSlice';
import { useToast } from '@/components/toast/toast';

const InfoContent: React.FC = () => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  useEffect(() => {
    if (me) {
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || ''
      });
    }
  }, [me]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }

    // Проверяем токен перед запросом
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
      return;
    }

    try {
      console.log('Saving profile:', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        hasToken: !!token,
        tokenLength: token.length
      });

      // Сначала проверяем, что токен валидный через getMe
      try {
        await dispatch(getMe()).unwrap();
      } catch (meError) {
        console.error('GetMe failed before update:', meError);
        toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
        return;
      }

      const result = await dispatch(
        updateAccountAction({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim()
        })
      ).unwrap();

      console.log('Update account result:', result);

      // Обновляем данные пользователя
      const meResult = await dispatch(getMe()).unwrap();
      console.log('GetMe result:', meResult);

      setIsEditing(false);
      dispatch(closeDrawer()); // Закрываем drawer при сохранении
      toast.success('Профиль успешно обновлен');
    } catch (error: any) {
      console.error('Update account error:', error);

      // Проверка на ошибки авторизации
      if (
        error?.message?.includes('PermissionDenied') ||
        error?.message?.includes('AUTHENTICATED_USER')
      ) {
        toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
        // Очищаем токен при ошибке авторизации
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userId');
      } else if (error?.payload) {
        toast.error(error.payload || 'Ошибка при обновлении профиля');
      } else {
        toast.error(error?.message || 'Ошибка при обновлении профиля');
      }
    }
  };

  const handleCancel = () => {
    if (me) {
      setFormData({
        firstName: me.firstName || '',
        lastName: me.lastName || '',
        email: me.email || ''
      });
    }
    setIsEditing(false);
  };
  const handleAddressSelect = () => {
    // setAddress('Москва');
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
              <button className={styles.changeBtn} onClick={handleSave}>
                <p>Сохранить</p>
              </button>
              <button className={styles.changeBtn} onClick={handleCancel}>
                <p>Отмена</p>
              </button>
            </div>
          )}
        </article>

        {isEditing ? (
          <article className={styles.aboutWrapper}>
            <div className={styles.wrapper}>
              <p className={styles.name}>Имя</p>
              <input
                type='text'
                name='firstName'
                value={formData.firstName}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div className={styles.wrapper}>
              <p className={styles.name}>Фамилия</p>
              <input
                type='text'
                name='lastName'
                value={formData.lastName}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div className={styles.wrapper}>
              <p className={styles.name}>Email</p>
              <input
                type='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                disabled
              />
            </div>
          </article>
        ) : (
          <article className={styles.aboutWrapper}>
            <div className={styles.wrapper}>
              <p className={styles.name}>Имя</p>
              <p className={styles.value}>{me?.firstName || 'Не указано'}</p>
            </div>
            <div className={styles.wrapper}>
              <p className={styles.name}>Фамилия</p>
              <p className={styles.value}>{me?.lastName || 'Не указано'}</p>
            </div>
            <div className={styles.wrapper}>
              <p className={styles.name}>Email</p>
              <p className={styles.value}>{me?.email || 'Не указано'}</p>
            </div>
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
            // URL будет добавлен позже
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
    </article>
  );
};

export default InfoContent;
