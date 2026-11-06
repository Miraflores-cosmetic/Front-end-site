import React from 'react';
import { Link } from 'react-router-dom';
import styles from './NotFound.module.scss';
import notFoundImg from '@/assets/images/404.png';
import { useDocumentSeo } from '@/hooks/useDocumentSeo';

export default function NotFound() {
  useDocumentSeo({
    title: 'Страница не найдена',
    titleAsIs: true,
    description: 'Запрашиваемая страница не существует.',
    noIndex: true,
  });
  return (
    <>
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
