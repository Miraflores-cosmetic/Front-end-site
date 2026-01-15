import React from 'react';
import styles from './InfoMobileContent.module.scss';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import { openDrawer } from '@/store/slices/drawerSlice';
import telegram from '@/assets/icons/telegram.svg';
import ArrowToRight from '@/assets/icons/ArrowToRight.svg';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { AddressInfo } from '@/types/auth';

interface InfoMobileContentProps {
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>; // ✅ type matches Sidebar
}

const InfoMobileContent: React.FC<InfoMobileContentProps> = ({ setOpenAccordion }) => {
  const dispatch = useDispatch();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch(450);

  const [selectedAddress, setSelectedAddress] = React.useState<AddressInfo | null>(null);

  const handleChange = () => {
    dispatch(openDrawer('about'));
  };

  const handleCloseAccordion = () => {
    setOpenAccordion(null);
  };

  const handleAddressSelect = (address: AddressInfo) => {
    setSelectedAddress(address);
  };

  const fullName = me ? `${me.firstName || ''} ${me.lastName || ''}`.trim() : 'Не указано';
  // Phone and Birthday are not currently in MeInfo, using placeholders to avoid confusion with mock data
  const phone = 'Не указано';
  const birthday = 'Не указано';

  return (
    <article className={styles.infoMobileContent}>
      {/* <p className={styles.title}>Общая информация</p> */}

      <article className={styles.infoWrapper}>
        <section className={styles.info}>
          <p className={styles.category}>ФИО</p>
          <p className={styles.value}>{fullName || 'Не указано'}</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Телефон</p>
          <p className={styles.value}>{phone}</p>
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
          <p className={styles.value}>{birthday}</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Получать поздравления?</p>
          <p className={styles.value}>Да</p>
        </section>

        <p className={styles.change} onClick={handleChange}>
          Изменить
        </p>
      </article>

      <DeliveryProfile onSelectAddress={handleAddressSelect} />
      {/* ✅ Close button */}
      <article className={styles.telegramContainer}>
        <div className={styles.telegramwrapper}>
          <div className={styles.top}>
            <img src={telegram} alt='telegram icon' className={styles.check} />
            <p>Авторизуйтесь через Телеграм</p>
          </div>
          <img src={ArrowToRight} alt='ArrowToRight' className={styles.ArrowToRight} />
        </div>
        <p className={styles.desc}>
          Чтобы получать уведомления о доставке и специальные предложения
        </p>
      </article>
      {isMobile && (
        <p className={styles.closeBtn} onClick={handleCloseAccordion}>
          Закрыть
        </p>
      )}
    </article>
  );
};

export default InfoMobileContent;
