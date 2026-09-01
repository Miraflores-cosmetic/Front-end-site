import React from 'react';
import { Link } from 'react-router-dom';
import styles from './InfoTestBlock.module.scss';
import flower from '@/assets/images/romashka.png';
import { SITE_EMAIL } from '@/config/siteNavLinks';
import { HomeSection } from '@/components/home-section/HomeSection';

export const InfoTest: React.FC = () => {
  return (
    <HomeSection className={styles.infoTest} aria-labelledby="info-test-title">
      <h2
        id="info-test-title"
        className={styles.title}
        aria-label="Подберите свой идеальный уход за кожей"
      >
        <span className={styles.titleLine} aria-hidden>
          Подберите св
          <img src={flower} alt="" className={styles.romashka} />
          й
        </span>
        <span className={styles.titleLine} aria-hidden>
          идеальный уход
        </span>
        <span className={styles.titleLine} aria-hidden>
          за кожей
        </span>
      </h2>
      <div className={styles.btnWrapper}>
        <Link to="/quiz" className={styles.btnTest}>
          Пройти тест
        </Link>
        <a href={SITE_EMAIL.href} className={styles.btnWrite}>
          Написать основательнице
        </a>
      </div>
    </HomeSection>
  );
};
