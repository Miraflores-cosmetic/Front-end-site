import React from 'react';
import styles from './QuizRichText.module.scss';

interface QuizRichTextProps {
  html: string;
  className?: string;
}

export const QuizRichText: React.FC<QuizRichTextProps> = ({ html, className }) => {
  return (
    <div
      className={`${styles.richText} ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
