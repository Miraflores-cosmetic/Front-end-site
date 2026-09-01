import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppLink from '@/components/AppLink/AppLink';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useScroll } from '@/hooks/useScroll';
import { VIEWPORT_TABLET_MAX } from '@/constants/viewport';
import { openDrawer } from '@/store/slices/drawerSlice';
import { getCatalogTags, getMenuItems } from '@/store/slices/navSlice';
import { isHiddenInNav } from '@/utils/navHide';
import type { AppDispatch, RootState } from '@/store/store';
import styles from './Header.module.scss';

/** Nav chrome: tablet and below use burger (avoids squeezed desktop links). */
const Header: React.FC = () => {
  const isNavMobile = useScreenMatch(VIEWPORT_TABLET_MAX);
  const isScrolled = useScroll();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const headerRef = useRef<HTMLElement>(null);

  const items = useSelector((state: RootState) => state.nav.items);
  const tags = useSelector((state: RootState) => state.nav.tags);
  const tagsLoading = useSelector((state: RootState) => state.nav.tagsLoading);
  const cartCount = useSelector((state: RootState) =>
    state.checkout.lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0)
  );
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const menuOpen = useSelector((state: RootState) => state.drawer.activeDrawer === 'menu');

  const navItems = items.filter((item) => !isHiddenInNav(item));

  useEffect(() => {
    if (items.length === 0) {
      dispatch(getMenuItems());
    }
  }, [dispatch, items.length]);

  useEffect(() => {
    if (tags.length === 0 && !tagsLoading) {
      dispatch(getCatalogTags());
    }
  }, [dispatch, tags.length, tagsLoading]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publishHeight = () => {
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    };
    publishHeight();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publishHeight) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [isNavMobile]);

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          {isNavMobile ? (
            <button
              type="button"
              className={styles.menuButton}
              aria-label="Открыть меню"
              aria-expanded={menuOpen}
              aria-controls="site-menu-drawer"
              data-menu-trigger
              onClick={() => dispatch(openDrawer('menu'))}
            >
              <span className={styles.burgerIcon} aria-hidden="true" />
            </button>
          ) : (
            <nav className={styles.navLeft} aria-label="Категории">
              {navItems.map((item) => (
                <AppLink to={`/catalog/${item.category.slug}`} key={item.id}>
                  {item.name}
                </AppLink>
              ))}
            </nav>
          )}
        </div>

        <button
          type="button"
          className={isNavMobile ? styles.logoMobile : styles.logo}
          onClick={() => navigate('/')}
          aria-label="Miraflores — на главную"
        >
          <img
            src={siteLogo}
            alt="Miraflores"
            width={isNavMobile ? 124 : 186}
            height={isNavMobile ? 14 : 20}
            decoding="async"
          />
        </button>

        <div className={styles.right}>
          {isNavMobile ? (
            <button
              type="button"
              className={styles.basketMobile}
              aria-label={cartCount > 0 ? `Корзина, ${cartCount}` : 'Корзина'}
              onClick={() => dispatch(openDrawer('basket'))}
            >
              <span>Корзина</span>
              {cartCount > 0 ? (
                <span className={styles.cartCount} aria-hidden="true">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </button>
          ) : (
            <nav className={styles.navRight} aria-label="Аккаунт и действия">
              {isAuth ? (
                <Link to="/profile">Профиль</Link>
              ) : (
                <Link to="/sign-in">Аккаунт</Link>
              )}
              <button
                type="button"
                className={styles.basket}
                aria-label={cartCount > 0 ? `Корзина, ${cartCount}` : 'Корзина'}
                onClick={() => dispatch(openDrawer('basket'))}
              >
                <span>Корзина</span>
                {cartCount > 0 ? (
                  <span className={styles.cartCount} aria-hidden="true">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={styles.searchButton}
                data-search-trigger
                aria-label="Поиск"
                onClick={() => dispatch(openDrawer('search'))}
              >
                Поиск
              </button>
              <button
                type="button"
                className={styles.menuLink}
                aria-expanded={menuOpen}
                aria-controls="site-menu-drawer"
                onClick={() => dispatch(openDrawer('menu'))}
              >
                Меню
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
