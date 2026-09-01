import React from 'react';
import { ImageWithFallback } from '@/components/image-with-fallback/ImageWithFallback';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import type { QuizMediaType } from '@/types/quizContent';
import styles from './QuizMedia.module.scss';

interface QuizMediaProps {
  url: string;
  mediaType: QuizMediaType;
  title?: string;
}

export const QuizMedia: React.FC<QuizMediaProps> = ({ url, mediaType, title }) => {
  const src = normalizeMediaUrl(url);
  if (!src) return null;

  if (mediaType === 'video') {
    return (
      <video className={styles.media} controls playsInline preload="metadata">
        <source src={src} />
      </video>
    );
  }

  if (mediaType === 'pdf') {
    return (
      <a className={styles.pdfLink} href={src} target="_blank" rel="noopener noreferrer">
        {title ?? 'Открыть PDF'}
      </a>
    );
  }

  return (
    <ImageWithFallback
      className={styles.media}
      src={src}
      alt={title ?? 'Рекомендация'}
      loading="lazy"
    />
  );
};
