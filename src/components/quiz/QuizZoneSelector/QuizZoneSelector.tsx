import React from 'react';
import styles from './QuizZoneSelector.module.scss';
import type { QuizZone } from '@/types/quiz';

interface QuizZoneSelectorProps {
  onSelect: (zone: QuizZone) => void;
}

export const QuizZoneSelector: React.FC<QuizZoneSelectorProps> = ({ onSelect }) => {
  return (
    <div className={styles.grid}>
      <button type="button" className={styles.card} onClick={() => onSelect('face')}>
        <span className={styles.emoji} aria-hidden>✨</span>
        <span className={styles.title}>Лицо</span>
        <span className={styles.description}>Квиз из 6 шагов — персональные рекомендации по уходу за кожей</span>
      </button>
      <button type="button" className={styles.card} onClick={() => onSelect('hair')}>
        <span className={styles.emoji} aria-hidden>💆</span>
        <span className={styles.title}>Волосы</span>
        <span className={styles.description}>Рекомендации по очищению и уходу за волосами</span>
      </button>
    </div>
  );
};
