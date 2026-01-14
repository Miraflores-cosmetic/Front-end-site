import React, { useEffect } from 'react';
import styles from './MenuDrawer.module.scss';
import MenuList from './menu-list/MenuList';
import linToMenu from '@/assets/icons/Miraflores_logo.svg';
import menuLine from '@/assets/icons/menuLine.svg';
import { RootState, AppDispatch } from '@/store/store';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import MenuRightPart from './menu-right-part/MenuRightPart';
import { useSelector, useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { getMenuItems } from '@/store/slices/navSlice';

const MenuDrawer: React.FC = () => {
  const isMobile = useScreenMatch(450);
  const { items, loading } = useSelector((state: RootState) => state.nav);
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

  const menuData: Record<string, MenuSection> = {
    navigation: {
      title: 'Каталог',
      link: 'category',
      items: menuItemsFromApi.length ? menuItemsFromApi : [{ label: 'Загрузка...', href: '#' }]
    },
    about: {
      title: 'О Компании',
      link: 'about',
      withColor: true,
      items: [
        { label: 'Наша история', href: '/about' },
        { label: 'Полезные статьи', href: '/about/articles' },
        { label: 'Программа благодарности', href: '/#gratitude-program' },
        { label: 'Подарочные сертификаты', href: '/gift-certificates' },
        { label: 'Промокоды', href: '/promocodes' }
      ]
    },
    info: {
      title: 'Информация',
      link: 'info',
      items: [
        { label: 'Условия пользования', href: '/terms' },
        { label: 'Политика конфиденциальности', href: '/privacy' },
        { label: 'Оплата и доставка', href: '/payment-delivery' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Контакты', href: '/contacts' },
        { label: 'Реквизиты', href: '/requisites' }
      ]
    },
    support: {
      title: 'Поддержка',
      link: 'support',
      items: [
        { label: 'Статус заказа', href: '/profile' },
        { label: 'info@miraflores.ru', href: 'mailto:info@miraflores.ru' },
        { label: '+7 (800) 890 78 99', href: 'tel:+78008907899' },
        { label: 'Телеграм →', href: 'https://t.me/Miraflores_Cosmetics_Bot' }
      ]
    },

    ...(isMobile && {
      account: {
        title: 'Аккаунт',
        items: []
      }
    })
  };

  return (
    <div className={styles.menuContainer}>
      {isMobile && (
        <div className={styles.menuMobileHeader}>
          <img src={menuLine} alt='menuLine' onClick={() => dispatch(closeDrawer())} />
          <img src={linToMenu} alt='linToMenu' />
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

      <MenuRightPart />
    </div>
  );
};

export default MenuDrawer;
