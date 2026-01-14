import React from 'react';
import styles from './HeaderRight.module.scss';
import { Link } from 'react-router-dom';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useDispatch, useSelector } from 'react-redux';
import { openDrawer } from '@/store/slices/drawerSlice';
import { RootState } from '@/store/store';

const HeaderRight: React.FC = () => {
  const isMobile = useScreenMatch(850);
  const dispatch = useDispatch();
  const count = useSelector((state: RootState) => state.checkout.lines.length);
  const { isAuth } = useSelector((state: RootState) => state.authSlice);

  return (
    <div>
      {isMobile ? (
        <div className={styles.basketMobile} onClick={() => dispatch(openDrawer('basket'))}>
          <Link to='#'>Корзина</Link>
          <p className={count > 0 ? styles.cartCount : styles.hideCartCount}>{count}</p>
        </div>
      ) : (
        <nav className={styles.navRight}>
          {isAuth ? <Link to='/profile'>Профиль</Link> : <Link to='/sign-in'>Аккаунт</Link>}
          <div className={styles.basket} onClick={() => dispatch(openDrawer('basket'))}>
            <Link to='#'>Корзина</Link>
            <p className={count > 0 ? styles.cartCount : styles.hideCartCount}>{count}</p>
          </div>

          <div className={styles.searchButton} onClick={() => dispatch(openDrawer('search'))}>
            Поиск
          </div>
          <Link to='#' onClick={() => dispatch(openDrawer('menu'))}>
            Меню
          </Link>
        </nav>
      )}
    </div>
  );
};

export default HeaderRight;
