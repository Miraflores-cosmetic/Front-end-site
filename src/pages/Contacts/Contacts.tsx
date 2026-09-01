import React, { useEffect } from 'react';
import iconMax from '@/assets/icons/Max.svg';
import iconWhatsapp from '@/assets/icons/whatsapp.svg';
import iconTg from '@/assets/icons/TG.svg';
import iconVk from '@/assets/icons/VK.svg';
import iconDzen from '@/assets/icons/Yandex_Zen.svg';
import iconRutube from '@/assets/icons/Rutube.svg';
import styles from './Contacts.module.scss';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';
import {
  SITE_DZEN_HREF,
  SITE_EMAIL,
  SITE_MAX_HREF,
  SITE_PHONE,
  SITE_RUTUBE_HREF,
  SITE_TELEGRAM_CHANNEL_HREF,
  SITE_TELEGRAM_SHOP_HREF,
  SITE_VK_HREF,
  SITE_WHATSAPP_HREF,
} from '@/config/siteNavLinks';

const messengerLinks = [
  {
    key: 'max',
    href: SITE_MAX_HREF,
    icon: iconMax,
    label: 'MAX',
    external: true,
  },
  {
    key: 'whatsapp',
    href: SITE_WHATSAPP_HREF,
    icon: iconWhatsapp,
    label: 'WhatsApp',
    external: true,
  },
  {
    key: 'telegram-shop',
    href: SITE_TELEGRAM_SHOP_HREF,
    icon: iconTg,
    label: 'Telegram',
    external: true,
  },
] as const;

const socialLinks = [
  {
    key: 'vk',
    href: SITE_VK_HREF,
    icon: iconVk,
    label: 'ВКонтакте',
    external: true,
  },
  {
    key: 'dzen',
    href: SITE_DZEN_HREF,
    icon: iconDzen,
    label: 'Дзен',
    external: true,
  },
  {
    key: 'rutube',
    href: SITE_RUTUBE_HREF,
    icon: iconRutube,
    label: 'Rutube',
    external: true,
  },
  {
    key: 'telegram-cosmetics',
    href: SITE_TELEGRAM_CHANNEL_HREF,
    icon: iconTg,
    label: 'Telegram-канал',
    external: true,
  },
] as const;

const Contacts: React.FC = () => {
  useDocumentSeo({
    title: 'Контакты',
    description:
      'Связаться с Miraflores: телефон, email, мессенджеры и социальные сети.',
    canonicalPath: '/contacts',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Контакты</h1>

      <p className={styles.row}>
        <span className={styles.label}>Тел.</span>
        <a className={styles.link} href={SITE_PHONE.href}>
          {SITE_PHONE.label}
        </a>
        <span className={styles.note}>10.00 – 19.00 мск по рабочим дням</span>
      </p>

      <p className={styles.row}>
        <span className={styles.label}>Email</span>
        <a className={styles.link} href={SITE_EMAIL.href}>
          {SITE_EMAIL.label}
        </a>
      </p>

      <ul className={`${styles.iconList} ${styles.iconListAfterPhone}`}>
        {messengerLinks.map(({ key, href, icon, label, external }) => (
          <li key={key}>
            <a
              className={styles.iconLink}
              href={href}
              aria-label={label}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <img src={icon} alt="" className={styles.icon} />
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default Contacts;
