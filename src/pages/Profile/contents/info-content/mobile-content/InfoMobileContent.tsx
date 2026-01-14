import React from 'react';
import styles from './InfoMobileContent.module.scss';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
// import { openDrawer } from "@/store/slices/drawerSlice";
import telegram from '@/assets/icons/telegram.svg';
import ArrowToRight from '@/assets/icons/ArrowToRight.svg';
// import { useDispatch } from "react-redux";
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { AddressInfo } from '@/types/auth';

interface InfoMobileContentProps {
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>; // ✅ type matches Sidebar
}

const InfoMobileContent: React.FC<InfoMobileContentProps> = ({ setOpenAccordion }) => {
  // const dispatch = useDispatch();
  const isMobile = useScreenMatch(450);

  const [selectedAddress, setSelectedAddress] = React.useState<AddressInfo | null>(null);

  const handleChange = () => {
    // dispatch(openDrawer("about"));
  };

  const handleCloseAccordion = () => {
    setOpenAccordion(null);
  };

    const handleAddressSelect = (address: AddressInfo) => {
      setSelectedAddress(address);
      
      // Auto-fill phone from address if the input is currently empty
    
    };

  return (
    <article className={styles.infoMobileContent}>
      <p className={styles.title}>Общая информация</p>

      <article className={styles.infoWrapper}>
        <section className={styles.info}>
          <p className={styles.category}>ФИО</p>
          <p className={styles.value}>Фёдор Ники́форович Плевако́</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Телефон</p>
          <p className={styles.value}>+7(913) 910 30-70</p>
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
          <p className={styles.value}>23 декабря</p>
        </section>

        <section className={styles.info}>
          <p className={styles.category}>Получать поздравления?</p>
          <p className={styles.value}>Да</p>
        </section>

        <p className={styles.change} onClick={handleChange}>
          Изменить
        </p>
      </article>

      <DeliveryProfile onSelectAddress={handleAddressSelect}/>
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
