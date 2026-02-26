import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './FooterMenu.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

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

const FooterMenu: React.FC<FooterMenuProps> = ({ title, items }) => {
  const isMobile = useScreenMatch(450);
  const location = useLocation();
  const navigate = useNavigate();

  const handleScrollToId = (e: React.MouseEvent, href: string, scrollToId: string) => {
    e.preventDefault();
    if (location.pathname === '/' || location.pathname === '') {
      document.getElementById(scrollToId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(href);
    }
  };

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
            ) : item.scrollToId ? (
              <Link
                to={item.href}
                title={item.title}
                onClick={(e) => handleScrollToId(e, item.href, item.scrollToId!)}
              >
                {item.label}
              </Link>
            ) : location.pathname === '/' ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer" title={item.title}>
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
