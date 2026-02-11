import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header/Header';
import styles from './NotFound.module.scss';
import notFoundImg from '@/assets/images/404.png';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className={styles.notFoundContainer}>
        <Link to="/" className={styles.backLink}>
          Вернуться на главную
        </Link>
        <img src={notFoundImg} alt="404" className={styles.notFoundImg} />
        <p className={styles.notFoundText}>такой страницы нет</p>
      </main>
    </>
  );
}
