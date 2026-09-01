import React from 'react';
import styles from './MenuList.module.scss';
import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import AppLink from '@/components/AppLink/AppLink';

type MenuItem = {
  label: string;
  href: string;
};

type MenuListProps = {
  title: string;
  /** Если задан — заголовок секции это Link (Каталог → /catalog/). */
  titleHref?: string;
  items: MenuItem[];
  withColor?: boolean;
  loading?: boolean;
};

const MenuList: React.FC<MenuListProps> = ({
  title,
  titleHref,
  items,
  withColor,
  loading,
}) => {
  const dispatch = useDispatch();

  const handleCloseDrawer = () => {
    dispatch(closeDrawer());
  };

  return (
    <div className={styles.menu}>
      <div className={styles.titleWrapper}>
        {titleHref ? (
          <AppLink
            to={titleHref}
            className={`${styles.menuTitle} ${styles.menuTitleLink} ${withColor ? styles.withColor : ''}`}
            onClick={handleCloseDrawer}
          >
            {title}
          </AppLink>
        ) : (
          <p className={`${styles.menuTitle} ${withColor ? styles.withColor : ''}`}>{title}</p>
        )}
      </div>
      <ul className={styles.menuList}>
        {loading ? (
          <li className={styles.menuItemMuted} aria-busy="true">
            Загрузка…
          </li>
        ) : null}
        {!loading &&
          items.map((item) => (
            <li key={`${item.href}-${item.label}`} className={styles.menuItem}>
              {item.href.startsWith('http') ||
              item.href.startsWith('mailto') ||
              item.href.startsWith('tel') ? (
                <a
                  href={item.href}
                  onClick={handleCloseDrawer}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {item.label}
                </a>
              ) : (
                <AppLink to={item.href} onClick={handleCloseDrawer}>
                  {item.label}
                </AppLink>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
};

export default MenuList;
