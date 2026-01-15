import React, { useState, useEffect } from 'react';
import styles from './AboutDrawer.module.scss';

import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Input } from './components/input-profile/Input';
import CustomCheckbox from '@/components/custom-checkBox/CustomCheckbox';
import warning from '@/assets/icons/warning.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { AppDispatch, RootState } from '@/store/store';
import { updateAccountAction, getMe } from '@/store/slices/authSlice';
import { useToast } from '@/components/toast/toast';

const AboutDrawer: React.FC = () => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const isMobile = useScreenMatch(450);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('**********');
  const [checked, setChecked] = useState(true);

  // Initialize state from Redux store
  useEffect(() => {
    if (me) {
      const fullName = [me.firstName, me.lastName].filter(Boolean).join(' ');
      setName(fullName || '');
      setEmail(me.email || '');
      // Phone and other fields logic if available in 'me'
    }
  }, [me]);

  const handleOrder = async () => {
    if (!name.trim()) {
      toast.error('Пожалуйста, введите имя');
      return;
    }

    try {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      await dispatch(
        updateAccountAction({
          firstName,
          lastName
        })
      ).unwrap();

      await dispatch(getMe()).unwrap();

      toast.success('Профиль успешно обновлен');
      dispatch(closeDrawer());
    } catch (error: any) {
      console.error('Update account error:', error);
      toast.error(error?.message || 'Ошибка при обновлении профиля');
    }
  };

  return (
    <div className={styles.drawer}>
      <div className={styles.contentWrapper}>
        <header className={styles.headerWrapper}>
          <p className={styles.aboutUs}>ИНФОРМАЦИЯ О ВАС</p>
          <p className={styles.close} onClick={() => dispatch(closeDrawer())}>
            ЗАКРЫТЬ
          </p>
        </header>
        <article className={styles.infoWrapper}>
          <Input label='' value={name} onChange={e => setName(e.target.value)} />
          <Input label='' value={phone} placeholder={phone ? '' : 'Телефон не указан'} onChange={e => setPhone(e.target.value)} />
          <Input label='' value={email} placeholder={email ? '' : 'Email не указан'} onChange={e => setEmail(e.target.value)} />
          <Input
            label=''
            type='password'
            value={password}
            buttonText='Сменить пароль'
            onButtonClick={() => alert('Change password')}
            onChange={e => setPassword(e.target.value)}
          />
        </article>
        <article className={styles.dadteOfBirdthWrapper}>
          <p className={styles.title}>Дата рождения</p>
          <div className={styles.infoAboutDateWrapper}>
            <article className={styles.inputWrapper}>
              <Input label='' value={date} placeholder={date ? '' : 'Дата рождения не указана'} onChange={e => setDate(e.target.value)} width='50%' />
              <Input
                label=''
                placeholder={`Год рождения (опционально)`}
                value={city}
                onChange={e => setCity(e.target.value)}
                width='50%'
              />
            </article>
            <article className={styles.checkboxWrapper}>
              <CustomCheckbox checked={checked} onChange={setChecked} />
              <label className={styles.label}>Получать поздравления</label>
            </article>
          </div>
        </article>
        <article className={styles.warningWrapper}>
          <img src={warning} alt='warning-icon' />
          <p>Небольшое описание поздравлений</p>
        </article>
      </div>
      <div className={styles.buttonWrapper}>
        <button className={styles.orderButton} onClick={handleOrder}>
          Сохранить
        </button>
      </div>
    </div>
  );
};

export default AboutDrawer;
