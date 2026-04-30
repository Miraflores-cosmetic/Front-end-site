import React, { useEffect, useState } from 'react';
import styles from './InfoMobileContent.module.scss';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import { openDrawer } from '@/store/slices/drawerSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { AddressInfo } from '@/types/auth';

interface InfoMobileContentProps {
  setOpenAccordion: React.Dispatch<React.SetStateAction<TabId | null>>;
}

function getMetadataValue(
  metadata: { key: string; value: string }[] | undefined,
  key: string
): string {
  if (!metadata) return '';
  return metadata.find(m => m.key === key)?.value || '';
}

const InfoMobileContent: React.FC<InfoMobileContentProps> = ({ setOpenAccordion }) => {
  const dispatch = useDispatch();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch();

  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [receiveGreetings, setReceiveGreetings] = useState(false);

  useEffect(() => {
    if (!me) return;
    const defaultAddress = me.addresses?.find(
      a => a.isDefaultBillingAddress || a.isDefaultShippingAddress
    );
    const phoneFromAddress = defaultAddress?.phone || '';
    const phoneFromMeta = getMetadataValue(me.metadata, 'phone');
    setPhone(phoneFromMeta || phoneFromAddress || '');
    setBirthday(getMetadataValue(me.metadata, 'birthday') || '');
    setReceiveGreetings(getMetadataValue(me.metadata, 'receiveGreetings') === 'true');
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

        <p className={styles.change} onClick={handleChange}>
          Изменить
        </p>
      </article>

      <DeliveryProfile onSelectAddress={(_address: AddressInfo) => {}} />

      {isMobile && (
        <p className={styles.closeBtn} onClick={handleCloseAccordion}>
          Закрыть
        </p>
      )}
    </article>
  );
};

export default InfoMobileContent;
