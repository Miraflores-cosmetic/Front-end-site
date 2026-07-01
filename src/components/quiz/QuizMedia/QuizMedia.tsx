import React from 'react';
import type { QuizMediaType } from '@/types/quizContent';
import styles from './QuizMedia.module.scss';

interface QuizMediaProps {
  url: string;
  mediaType: QuizMediaType;
  title?: string;
}

export const QuizMedia: React.FC<QuizMediaProps> = ({ url, mediaType, title }) => {
  if (mediaType === 'video') {
    return (
      <video className={styles.media} controls playsInline preload="metadata">
        <source src={url} />
      </video>
    );
  }

  if (mediaType === 'pdf') {
    return (
      <a className={styles.pdfLink} href={url} target="_blank" rel="noopener noreferrer">
        {title ?? 'Открыть PDF'}
      </a>
    );
  }

  return (
    <img
      className={styles.media}
      src={url}
      alt={title ?? 'Рекомендация'}
      loading="lazy"
    />
  );
};
