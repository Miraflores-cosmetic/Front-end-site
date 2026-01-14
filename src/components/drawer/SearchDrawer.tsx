import React from 'react';
import styles from './SearchDrawer.module.scss';
import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import type { RootState } from '@/store/store';
import Search from '@/components/Search/Search';

const SearchDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const isOpen = useSelector((s: RootState) => s.drawer.activeDrawer === 'search');

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={() => dispatch(closeDrawer())}>
      <div className={styles.container} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={() => dispatch(closeDrawer())}>
          ✕
        </button>

        <Search />
      </div>
    </div>
  );
};

export default SearchDrawer;
