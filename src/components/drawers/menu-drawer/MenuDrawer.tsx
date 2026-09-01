import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { VIEWPORT_TABLET_MAX } from '@/constants/viewport';
import { getCatalogTags, getMenuItems } from '@/store/slices/navSlice';
import type { AppDispatch, RootState } from '@/store/store';
import { DesktopMenuLayout } from './DesktopMenuLayout';
import { MobileMenuLayout } from './MobileMenuLayout';
import styles from './MenuDrawer.module.scss';

const MenuDrawer: React.FC = () => {
  const isNavMobile = useScreenMatch(VIEWPORT_TABLET_MAX);
  const { items, tags, tagsLoading } = useSelector((state: RootState) => state.nav);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!items.length) {
      dispatch(getMenuItems());
    }
  }, [items.length, dispatch]);

  useEffect(() => {
    if (!tags.length && !tagsLoading) {
      dispatch(getCatalogTags());
    }
  }, [tags.length, tagsLoading, dispatch]);

  return (
    <div
      id="site-menu-drawer"
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-label="Меню сайта"
    >
      {isNavMobile ? <MobileMenuLayout /> : <DesktopMenuLayout />}
    </div>
  );
};

export default MenuDrawer;
