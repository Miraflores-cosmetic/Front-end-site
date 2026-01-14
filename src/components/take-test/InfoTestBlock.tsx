import React from 'react';
import styles from './InfoTestBlock.module.scss';
import flower from '@/assets/icons/romashka.svg';

export const InfoTest: React.FC = () => {
  return (
    <section className={styles.infoTest}>
      <div className={styles.textWrapper}>
        <p> Подберите свой</p>
        <p> идеальный уход </p>
        <p>за кожей</p>
        <img src={flower} alt={'Flower'} className={styles.romashka} />
      </div>
      <div className={styles.btnWrapper}>
        <a 
          href="https://t.me/Miraflores_Cosmetics_Bot" 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.btnTest}
        >
          Пройти тест
        </a>
        <a 
          href="https://t.me/Miraflores_Cosmetics_Bot" 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.btnWrite}
        >
          Написать основательнице
        </a>
      </div>
    </section>
  );
};
