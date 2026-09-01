import React from 'react';
import styles from './QuizResultEmptyNotice.module.scss';

type QuizResultEmptyNoticeProps = {
  variant?: 'profile' | 'quiz';
};

export const QuizResultEmptyNotice: React.FC<QuizResultEmptyNoticeProps> = ({
  variant = 'profile',
}) => (
  <div className={styles.notice} role="status">
    <p className={styles.title}>Программа сохранена, но контент ещё не настроен</p>
    <p className={styles.text}>
      {variant === 'profile'
        ? 'Ваши ответы квиза есть в аккаунте, но тексты и товары для этой ветки не заполнены в админке (Квиз → Настройка → «Тексты результата»).'
        : 'Тексты и товары для этой ветки не заполнены в админке. Обратитесь к администратору или пройдите квиз позже.'}
    </p>
  </div>
);
