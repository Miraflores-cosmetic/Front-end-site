import React from 'react';
import styles from './Awards.module.scss';

import awardImage from '@/assets/images/awardImage.webp';
import leaf from '@/assets/images/leaf.webp';
import romashkaBig from '@/assets/icons/romashkaBig.svg';
import medal from '@/assets/icons/medal.webp';

import { useScreenMatch } from '@/hooks/useScreenMatch';

const AWARD_TEXTS = [
  'Собственное производство гидралатов, экстрактов и купажей',
  'Без искусственных ароматов: только естественные, мягкие ароматы и эфирные масла',
  'Средства поддерживают естественный барьер кожи, не нарушая её липидные структуры',
  'Не тестируем косметику на животных',
  'Используем физиологичные формулы и рецептуры для достижения максимальной эффективности',
  'Используем только научный доказательный подход'
];

export const Awards: React.FC = () => {
  const isMobile = useScreenMatch(800);

  return (
    <section className={styles.awardsContainer}>
      {/* Заголовок */}
      <div className={styles.titleWrapper}>
        <p className={styles.title}>Награды за натуральность, эффективность и заботу о коже</p>
        <p className={styles.desc}>15 лет доверия и признания</p>
      </div>

      {/* Контент */}
      <div className={styles.content}>
        {/* Левая колонка */}
        <div className={styles.leftWrapper}>
          <div className={styles.textWrapper}>
            {AWARD_TEXTS.map((text, index) => (
              <p key={index} className={styles.txt}>
                {text}
              </p>
            ))}
            <img src={medal} alt='Медаль за качество' className={styles.medal} />
          </div>
        </div>

        {/* Центр (только для desktop) */}
        {!isMobile && (
          <div className={styles.centerWrapper}>
            <img src={romashkaBig} alt='Ромашка' />
          </div>
        )}

        {/* Правая колонка */}
        <div className={styles.rightWrapper}>
          {isMobile ? (
            <div className={styles.bottomImageWrapper}>
              <img src={awardImage} className={styles.awardImageMobile} alt='Награда' />
              <img src={leaf} className={styles.leaf} alt='Листок' />
            </div>
          ) : (
            <img src={awardImage} alt='Награда' />
          )}
        </div>
      </div>
    </section>
  );
};
