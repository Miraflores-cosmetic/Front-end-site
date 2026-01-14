import React from 'react';
import styles from './Promocodes.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';

const Promocodes: React.FC = () => {
  return (
    <>
      <Header />
      <main className={styles.promocodesContainer}>
        <div className={styles.content}>
          <h1 className={styles.title}>Промокоды</h1>
          <p className={styles.message}>Страница находится в разработке</p>
        </div>
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default Promocodes;
