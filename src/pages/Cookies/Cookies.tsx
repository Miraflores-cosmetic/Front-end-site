import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Cookies.module.scss';

const COOKIE_ROWS = [
  {
    name: 'Сессионные / авторизация',
    purpose: 'Вход в кабинет, защита сессии, CSRF',
    type: 'Необходимые',
    storage: 'Cookie / localStorage',
    term: 'Сессия или до выхода; токены — по сроку действия',
  },
  {
    name: 'Корзина',
    purpose: 'Сохранение состава заказа между визитами',
    type: 'Необходимые',
    storage: 'localStorage',
    term: 'До очистки корзины или до ~30 дней бездействия',
  },
  {
    name: 'Предпочтения интерфейса',
    purpose: 'Состояние UI (меню, черновики форм), если сохраняются локально',
    type: 'Функциональные',
    storage: 'localStorage / sessionStorage',
    term: 'До очистки данных браузера или истечения сессии',
  },
  {
    name: 'Аналитика (при подключении)',
    purpose: 'Счётчики посещений, источники трафика, улучшение сайта',
    type: 'Аналитические',
    storage: 'Cookie стороннего провайдера',
    term: 'По политике провайдера (обычно от 1 дня до 24 месяцев)',
  },
] as const;

const Cookies: React.FC = () => {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Cookies</h1>
        <p className={styles.text}>
          На сайте Miraflores могут использоваться cookie и сходные технологии
          (localStorage, sessionStorage) для работы сервиса, корзины, входа в
          кабинет, безопасности и — при подключении — аналитики. Обработка
          персональных данных описана в{' '}
          <Link to="/info/politika-konfidentsialnosti">
            Политике конфиденциальности
          </Link>
          .
        </p>

        <h2 className={styles.sectionTitle}>Какие данные мы можем хранить</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Название / группа</th>
                <th scope="col">Назначение</th>
                <th scope="col">Тип</th>
                <th scope="col">Хранение</th>
                <th scope="col">Срок</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_ROWS.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.purpose}</td>
                  <td>{row.type}</td>
                  <td>{row.storage}</td>
                  <td>{row.term}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className={styles.sectionTitle}>Управление</h2>
        <p className={styles.text}>
          Необходимые данные нужны для оформления заказа и входа. Аналитические
          cookie (если подключены) можно ограничить настройками браузера или
          расширениями. Отключение необходимых технологий может нарушить работу
          корзины и личного кабинета.
        </p>
        <p className={styles.text}>
          Оператор: ИП Патрацкий Д.А., контакт:{' '}
          <a href="mailto:info@miraflores.ru">info@miraflores.ru</a>.
        </p>
        <p className={styles.meta}>
          Версия документа: 1 · Дата: 30.08.2026
        </p>
      </div>
    </main>
  );
};

export default Cookies;
