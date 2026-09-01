import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import styles from './MobileMenuLayout.module.scss';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import centerImageMenu from '@/assets/images/centerImageMenu.png';
import { MenuNavSections } from './MenuNavSections';
import { closeDrawer, openDrawer } from '@/store/slices/drawerSlice';
import type { RootState } from '@/store/store';

export function MobileMenuLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuth } = useSelector((state: RootState) => state.authSlice);

  const close = () => dispatch(closeDrawer());

  return (
    <div className={styles.layout}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Закрыть меню"
          onClick={close}
        >
          <span className={styles.closeIcon} aria-hidden="true" />
        </button>
        <img src={siteLogo} alt="Miraflores" className={styles.logo} />
      </div>

      <nav className={styles.nav} aria-label="Разделы сайта">
        <MenuNavSections />
        <div className={styles.quiz}>
          <figure className={styles.quizFigure}>
            <img
              src={centerImageMenu}
              alt=""
              width={188}
              height={216}
              className={styles.quizImage}
              aria-hidden="true"
            />
            <figcaption className={styles.quizCaption}>
              <button
                type="button"
                className={styles.quizBtn}
                onClick={() => {
                  close();
                  navigate('/quiz');
                }}
              >
                Подобрать уход
              </button>
            </figcaption>
          </figure>
        </div>
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.secondaryBtn}
          data-search-trigger
          onClick={() => dispatch(openDrawer('search'))}
        >
          Поиск
        </button>
        <Link
          to={isAuth ? '/profile' : '/sign-in'}
          className={styles.accountBtn}
          onClick={close}
        >
          {isAuth ? 'Профиль' : 'Войти в аккаунт'}
        </Link>
      </div>
    </div>
  );
}
