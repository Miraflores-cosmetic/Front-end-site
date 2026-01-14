import React from 'react';
import styles from './MenuList.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import arrow from '@/assets/icons/ArrowToRight.svg';
import mobileImage from '@/assets/images/mobileImage.webp';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Link } from 'react-router-dom';

type MenuItem = {
  label: string;
  href: string;
};

type MenuListProps = {
  title: string;
  link: string;
  items: MenuItem[];
  withColor?: boolean;
};

const MenuList: React.FC<MenuListProps> = ({ title, items, withColor, link }) => {
  const isMobile = useScreenMatch(450);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleCloseDrawer = () => {
    dispatch(closeDrawer());
  };

  const handletoCatalog = () => {
    handleCloseDrawer();
    if (link) {
      // Если link это путь к каталогу или другой странице
      if (link === 'category') {
        navigate('/catalog/');
      } else if (link === 'about') {
        navigate('/about');
      } else {
        navigate(`/${link}`);
      }
    }
  };

  return (
    <div className={styles.menu}>
      <div className={styles.titleWrapper}>
        <p className={`${styles.menuTitle} ${withColor ? styles.withColor : ''}`}>{title}</p>
        <img src={arrow} alt='' className={styles.arraw} onClick={handletoCatalog} />
      </div>
      {isMobile && title === 'Аккаунт' && (
        <div className={styles.mobileWrapper}>
          <p className={styles.mobileWrapperTxt}>Подберем персональный уход за 5 мин!</p>
          <img src={mobileImage} alt='mobileImage' className={styles.mobileImage} />
          <a 
            href="https://t.me/Miraflores_Cosmetics_Bot" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.mobileBtn}
            onClick={handleCloseDrawer}
          >
            Пройти тест
          </a>
        </div>
      )}
      <ul className={styles.menuList}>
        {items.map((item, index) => (
          <li key={index} className={styles.menuItem}>
            {item.href.startsWith('http') || item.href.startsWith('mailto') || item.href.startsWith('tel') ? (
              <a href={item.href} onClick={handleCloseDrawer} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {item.label}
              </a>
            ) : item.href.startsWith('/#') ? (
              <Link 
                to={item.href} 
                onClick={() => {
                  handleCloseDrawer();
                  // Небольшая задержка для закрытия drawer перед скроллом
                  setTimeout(() => {
                    const hash = item.href.substring(1);
                    const element = document.querySelector(hash);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 300);
                }}
              >
                {item.label}
              </Link>
            ) : (
              <Link to={item.href} onClick={handleCloseDrawer}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MenuList;
