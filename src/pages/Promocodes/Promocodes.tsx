import React from 'react';
import styles from './Promocodes.module.scss';

const Promocodes: React.FC = () => {
  return (
    <>
      <main className={styles.promocodesContainer}>
        <div className={styles.content}>
          <h1 className={styles.title}>Промокоды</h1>
          <p className={styles.message}>Страница находится в разработке</p>
        </div>
      </main>
    </>
  );
};

export default Promocodes;
