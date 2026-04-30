import React, { useEffect } from 'react';
import AppLink from '@/components/AppLink/AppLink';
import { openDrawer } from '@/store/slices/drawerSlice';
import { useSelector, useDispatch } from 'react-redux';
import styles from './HeaderLeft.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { RootState, AppDispatch } from '@/store/store';
import { getMenuItems } from '@/store/slices/navSlice';

/** Slug'и категорий, которые не показывать в navLeft. Доп. через .env: VITE_HIDE_HEADER_CATEGORY_SLUG (один или через запятую). */
const HIDE_SLUGS_IN_NAV_LEFT = (() => {
  const fromEnv = import.meta.env.VITE_HIDE_HEADER_CATEGORY_SLUG;
  const envSlugs = fromEnv ? String(fromEnv).split(',').map((s: string) => s.trim()).filter(Boolean) : ['podarochnye-sertifikaty'];
  return new Set([
    ...envSlugs,
    'ekotovary',
    'eko-tovary',
    'ecotovary',
    'eko_tovary'
  ]);
})();

/** Названия (подстрока, без учёта регистра), при которых категорию скрывать в navLeft (напр. «Экотовары»). */
const HIDE_NAMES_IN_NAV_LEFT = ['экотовар', 'ekotovary', 'eko-tovary', 'eco-tovary'];

function isHiddenInNavLeft(item: { name?: string; category: { slug?: string } }): boolean {
  if (HIDE_SLUGS_IN_NAV_LEFT.has(item.category.slug ?? '')) return true;
  const nameLower = (item.name ?? '').toLowerCase();
  if (HIDE_NAMES_IN_NAV_LEFT.some(hide => nameLower.includes(hide))) return true;
  return false;
}

const HeaderLeft: React.FC = () => {
  const items = useSelector((state: RootState) => state.nav.items);
  const isMobile = useScreenMatch();
  const dispatch = useDispatch<AppDispatch>();

  const headerItems = items.filter(item => !isHiddenInNavLeft(item));

  useEffect(() => {
    if (items.length === 0) {
      dispatch(getMenuItems());
    }
  }, [dispatch, items.length]);

  return (
    <div>
      {isMobile ? (
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open menu"
          onClick={() => dispatch(openDrawer('menu'))}
        >
          <span className={styles.burgerIcon} aria-hidden="true" />
        </button>
      ) : (
        <nav className={styles.navLeft}>
          {headerItems.map(item => {
            const href = '/category/' + item.category.slug;
            return (
              <AppLink to={href} key={item.id}>{item.name}</AppLink>
            );
          })}
        </nav>
      )}
    </div>
  );
};

export default HeaderLeft;
