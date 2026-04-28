import React, { useEffect } from 'react';
import styles from './SearchDrawer.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import type { RootState } from '@/store/store';
import Search from '@/components/Search/Search';
import { useLocation } from 'react-router-dom';

const SearchDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s: RootState) => s.drawer.activeDrawer === 'search');
  const location = useLocation();

  // Закрываем поиск при любой смене маршрута (переход на товар/статью и т.п.)
  useEffect(() => {
    if (!isOpen) return;
    dispatch(closeDrawer());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={() => dispatch(closeDrawer())}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={() => dispatch(closeDrawer())}>
          ✕
        </button>
        <div className={styles.scrollArea}>
          <Search />
        </div>
      </div>
    </div>
  );
};

export default SearchDrawer;
