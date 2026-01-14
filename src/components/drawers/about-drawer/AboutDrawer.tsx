import React, { useState } from 'react';
import styles from './AboutDrawer.module.scss';

import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Input } from './components/input-profile/Input';
import CustomCheckbox from '@/components/custom-checkBox/CustomCheckbox';
import warning from '@/assets/icons/warning.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';

const AboutDrawer: React.FC = () => {
  const [name, setName] = useState('Фёдор Ники́форович Плевако́ ');
  const [email, setEmail] = useState('f.plevako@gmail.com');
  const [phone, setPhone] = useState('+7(913) 910 30-70');
  const [date, setDate] = useState('23 декабря');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('**********');
  const [checked, setChecked] = useState(true);
  const isMobile = useScreenMatch(450);

  const dispatch = useDispatch();

  const handleOrder = () => {
    dispatch(closeDrawer());
  };

  return (
    <div className={styles.drawer}>
      <div className={styles.contentWrapper}>
        <header className={styles.headerWrapper}>
          <p className={styles.aboutUs}>Информация о вас</p>
          <p className={styles.close} onClick={handleOrder}>
            Закрыть
          </p>
        </header>
        <article className={styles.infoWrapper}>
          <Input label='' value={name} onChange={e => setName(e.target.value)} />
          <Input label='' value={email} onChange={e => setEmail(e.target.value)} />
          <Input label='' value={phone} onChange={e => setPhone(e.target.value)} />
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
              <Input label='' value={date} onChange={e => setDate(e.target.value)} width='50%' />
              <Input
                label=''
                placeholder={`Год рождения${isMobile ? ' (необяз.)' : ' (необязательно)'}`}
                value={city}
                onChange={e => setCity(e.target.value)}
                width='50%'
              />
            </article>
            <article className={styles.checkboxWrapper}>
              <CustomCheckbox checked={checked} onChange={setChecked} />
              <label className={styles.label}>Получать поздравлнеия</label>
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
