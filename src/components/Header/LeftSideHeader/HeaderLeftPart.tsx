import React, {useEffect}from 'react';
import { Link } from 'react-router-dom';
import { openDrawer } from '@/store/slices/drawerSlice';
import { useSelector, useDispatch } from 'react-redux';
import styles from './HeaderLeft.module.scss';
import menu from '@/assets/icons/menu.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { RootState, AppDispatch } from '@/store/store';
import { getMenuItems } from '@/store/slices/navSlice';

/** Slug категории, которую не показывать в хедере (например «Подарочные сертификаты»). Задать в .env: VITE_HIDE_HEADER_CATEGORY_SLUG */
const HIDE_HEADER_CATEGORY_SLUG =
  import.meta.env.VITE_HIDE_HEADER_CATEGORY_SLUG || 'podarochnye-sertifikaty';

const HeaderLeft: React.FC = () => {
  const items = useSelector((state: RootState) => state.nav.items);
  const isMobile = useScreenMatch(850);
  const dispatch = useDispatch<AppDispatch>();

  const headerItems = items.filter(
    item => item.category.slug !== HIDE_HEADER_CATEGORY_SLUG
  );

  useEffect(() => {
    if (items.length === 0) {
      dispatch(getMenuItems());
    }
  }, [dispatch, items.length]);

  return (
    <div>
      {isMobile ? (
        <button className={styles.menuButton} onClick={() => dispatch(openDrawer('menu'))}>
          <img src={menu} alt='menu' />
        </button>
      ) : (
        <nav className={styles.navLeft}>
          {headerItems.map(item => (
            <Link to={'/category/' + item.category.slug} key={item.id}>{item.name}</Link>
          ))}
        </nav>
      )}
    </div>
  );
};

export default HeaderLeft;
