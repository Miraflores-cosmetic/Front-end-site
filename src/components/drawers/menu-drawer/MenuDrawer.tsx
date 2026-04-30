import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './MenuDrawer.module.scss';
import MenuList from './menu-list/MenuList';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import { RootState, AppDispatch } from '@/store/store';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import MenuRightPart from './menu-right-part/MenuRightPart';
import { useSelector, useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { getMenuItems } from '@/store/slices/navSlice';

const MenuDrawer: React.FC = () => {
  const isMobile = useScreenMatch(768);
  const { items } = useSelector((state: RootState) => state.nav);
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!items.length) {
      dispatch(getMenuItems());
    }
  }, [items.length, dispatch]);
  interface MenuSection {
    title: string;
    link?: string;
    withColor?: boolean;
    items: { label: string; href: string }[];
  }

  const menuItemsFromApi = items.map(item => ({
    label: item.name,
    href: '/category/' + item.category.slug
  }));

  const catalogItems = menuItemsFromApi.length
    ? menuItemsFromApi
    : [{ label: 'Загрузка...', href: '#' }];

  const menuData: Record<string, MenuSection> = {
    navigation: {
      title: 'Каталог',
      link: 'category',
      items: catalogItems
    },
    about: {
      title: 'О Компании',
      link: '',
      withColor: true,
      items: [
        { label: 'Наша история', href: '/about' },
        { label: 'Полезные статьи', href: '/articles' },
        { label: 'Программа благодарности', href: '/articles/programma-blagodarnosti-2' }
      ]
    },
    info: {
      title: 'Информация',
      link: '',
      items: [
        { label: 'Оферта и условия пользования', href: '/info/oferta-i-usloviia-polzovaniia' },
        { label: 'Политика конфиденциальности', href: '/info/politika-konfidentsialnosti' },
        { label: 'Оплата и доставка', href: '/info/oplata-i-dostavka' },
        { label: 'FAQ', href: '/#faq' }
      ]
    },
    support: {
      title: 'Поддержка',
      link: '',
      items: [
        { label: 'Статус заказа', href: '/profile' },
        { label: 'Контакты', href: '/contacts' }
      ]
    }
  };

  return (
    <div className={styles.menuContainer}>
      {isMobile && (
        <div className={styles.menuMobileHeader}>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Закрыть меню"
            onClick={() => dispatch(closeDrawer())}
          >
            <span className={styles.closeIcon} aria-hidden="true" />
          </button>
          <img src={siteLogo} alt="Miraflores" className={styles.menuHeaderLogo} />
        </div>
      )}
      <div className={styles.left}>
        {Object.entries(menuData).map(([key, section]) => (
          <MenuList
            key={key}
            title={section.title}
            items={section.items}
            link={section.link ?? ''}
            withColor={(section as any).withColor}
          />
        ))}
      </div>

      {isMobile && (
        <div className={styles.menuMobileAccount}>
          <Link
            to={isAuth ? '/profile' : '/sign-in'}
            className={styles.menuMobileAccountBtn}
            onClick={() => dispatch(closeDrawer())}
          >
            {isAuth ? 'Аккаунт' : 'Войти в аккаунт'}
          </Link>
        </div>
      )}

      <MenuRightPart />
    </div>
  );
};

export default MenuDrawer;
