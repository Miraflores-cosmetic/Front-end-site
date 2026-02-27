import React from 'react';
import AppLink from '@/components/AppLink/AppLink';
import styles from './FooterMenu.module.scss';

type MenuItem = {
  label: string;
  href: string;
  isExternal?: boolean;
  title?: string;
  scrollToId?: string;
};

type FooterMenuProps = {
  title: string;
  items: MenuItem[];
};

const FooterMenu: React.FC<FooterMenuProps> = ({ title, items }) => (
    <div className={styles.footerMenu}>
      <p className={styles.menuTitle}>{title}</p>
      <ul className={styles.menuList}>
        {items.map((item, index) => (
          <li key={index} className={styles.menuItem}>
            {item.isExternal ? (
              <a
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                title={item.title}
              >
                {item.label}
              </a>
            ) : item.scrollToId ? (
              <AppLink to={item.href} title={item.title}>
                {item.label}
              </AppLink>
            ) : (
              <AppLink to={item.href} title={item.title}>{item.label}</AppLink>
            )}
          </li>
        ))}
      </ul>
    </div>
);

export default FooterMenu;
