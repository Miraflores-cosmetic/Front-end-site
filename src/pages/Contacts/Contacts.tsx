import React, { useEffect } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import iconMax from '@/assets/icons/Max.svg';
import iconWhatsapp from '@/assets/icons/whatsapp.svg';
import iconTg from '@/assets/icons/TG.svg';
import iconVk from '@/assets/icons/VK.svg';
import iconDzen from '@/assets/icons/Yandex_Zen.svg';
import iconRutube from '@/assets/icons/Rutube.svg';
import styles from './Contacts.module.scss';

const PHONE_DISPLAY = '+7 (916) 427-9237';
const PHONE_TEL = '+79164279237';

const messengerLinks = [
  {
    key: 'max',
    href: `tel:${PHONE_TEL}`,
    icon: iconMax,
    label: 'MAX',
    external: false
  },
  {
    key: 'whatsapp',
    href: 'https://wa.me/79164279237',
    icon: iconWhatsapp,
    label: 'WhatsApp',
    external: true
  },
  {
    key: 'telegram-shop',
    href: 'https://t.me/miraflores_shop',
    icon: iconTg,
    label: 'Telegram',
    external: true
  }
] as const;

const socialLinks = [
  {
    key: 'vk',
    href: 'https://vk.com/miraflores',
    icon: iconVk,
    label: 'ВКонтакте',
    external: true
  },
  {
    key: 'dzen',
    href: 'https://dzen.ru/miraflores',
    icon: iconDzen,
    label: 'Дзен',
    external: true
  },
  {
    key: 'rutube',
    href: 'https://rutube.ru/channel/1284540/',
    icon: iconRutube,
    label: 'Rutube',
    external: true
  },
  {
    key: 'telegram-cosmetics',
    href: 'https://t.me/miraflores_cosmetics',
    icon: iconTg,
    label: 'Telegram-канал',
    external: true
  }
] as const;

const Contacts: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className={styles.page}>
        <h1 className={styles.title}>Контакты</h1>

        <p className={styles.row}>
          <span className={styles.label}>Тел.</span>
          <a className={styles.link} href={`tel:${PHONE_TEL}`}>
            {PHONE_DISPLAY}
          </a>
          <span className={styles.note}>10.00 – 19.00 мск по рабочим дням</span>
        </p>

        <ul className={`${styles.iconList} ${styles.iconListAfterPhone}`}>
          {messengerLinks.map(({ key, href, icon, label, external }) => (
            <li key={key}>
              <a
                className={styles.iconLink}
                href={href}
                aria-label={label}
                {...(external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <img src={icon} alt="" className={styles.icon} />
              </a>
            </li>
          ))}
        </ul>

        <h2 className={`${styles.sectionTitle} ${styles.sectionTitleIcons}`}>Соц сети</h2>
        <ul className={styles.iconList}>
          {socialLinks.map(({ key, href, icon, label, external }) => (
            <li key={key}>
              <a
                className={styles.iconLink}
                href={href}
                aria-label={label}
                {...(external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                <img src={icon} alt="" className={styles.icon} />
              </a>
            </li>
          ))}
        </ul>
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default Contacts;
