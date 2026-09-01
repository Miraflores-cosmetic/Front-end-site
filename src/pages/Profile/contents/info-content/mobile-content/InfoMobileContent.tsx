import React, { useEffect, useState } from 'react';
import styles from './InfoMobileContent.module.scss';
import DeliveryProfile from '@/components/delivery-profile/DeliveryProfile';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import { openDrawer } from '@/store/slices/drawerSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { AddressInfo } from '@/types/auth';
import ChangePasswordModal from '@/components/change-password-modal/ChangePasswordModal';

interface InfoMobileContentProps {
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const InfoMobileContent: React.FC<InfoMobileContentProps> = ({ setOpenAccordion }) => {
  const dispatch = useDispatch();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [receiveGreetings, setReceiveGreetings] = useState(false);

  useEffect(() => {
    if (!me) return;
    setPhone(me.phone || '');
    setBirthday(me.birthday || '');
    setReceiveGreetings(me.marketingConsent === true);
  }, [me]);

  const handleChange = () => {
    dispatch(openDrawer('about'));
  };

  const handleCloseAccordion = () => {
    setOpenAccordion(null);
  };

  const fullName = me ? `${me.firstName || ''} ${me.lastName || ''}`.trim() : '';

  const formatPhone = (p: string) => {
    if (!p) return 'Не указан';
    return p;
  };

  const formatBirthday = (date: string) => {
    if (!date) return 'Не указана';
    if (date.includes('-')) {
      const [year, month, day] = date.split('-');
      return `${day}.${month}.${year}`;
    }
    return date;
  };

  return (
    <article className={styles.infoMobileContent}>
      <article className={styles.infoWrapper}>
        <section className={styles.info}>
          <p className={styles.category}>ФИО</p>
          <p className={styles.value}>{fullName || 'Не указано'}</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Телефон</p>
          <p className={styles.value}>{formatPhone(phone)}</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Email</p>
          <p className={styles.value}>{me?.email || 'Не указано'}</p>
        </section>

        <section className={styles.infoPass}>
          <p className={styles.category}>Пароль</p>
          <article className={styles.dotsWrapper}>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={styles.dot} />
            ))}
          </article>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Дата рождения</p>
          <p className={styles.value}>{formatBirthday(birthday)}</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Получать поздравления?</p>
          <p className={styles.value}>{receiveGreetings ? 'Да' : 'Нет'}</p>
        </section>

        <button type="button" className={styles.change} onClick={handleChange}>
          Изменить
        </button>
        <button
          type="button"
          className={styles.passwordBtn}
          onClick={() => setShowPasswordModal(true)}
        >
          Сменить пароль
        </button>
      </article>

      <DeliveryProfile onSelectAddress={(_address: AddressInfo) => {}} />

      <section className={styles.bestsellersSection}>
        <p className={styles.bestsellersTitle}>КОЕ-ЧТО НОВОЕ ДЛЯ ВАС</p>
        <Bestsellers isTitleHidden isProfilePage />
      </section>

      {isMobile ? (
        <button type="button" className={styles.closeBtn} onClick={handleCloseAccordion}>
          Закрыть
        </button>
      ) : null}

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </article>
  );
};

export default InfoMobileContent;
