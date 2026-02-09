import React from 'react';
import { Link } from 'react-router-dom';
import styles from './FooterMenu.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

type MenuItem = {
  label: string;
  href: string;
  isExternal?: boolean;
  title?: string;
};

type FooterMenuProps = {
  title: string;
  items: MenuItem[];
};

const FooterMenu: React.FC<FooterMenuProps> = ({ title, items }) => {
  const isMobile = useScreenMatch(450);

  return (
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
            ) : (
              <Link to={item.href} title={item.title}>{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FooterMenu;
