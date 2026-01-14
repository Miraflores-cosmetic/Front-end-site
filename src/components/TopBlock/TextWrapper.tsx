import React from 'react';
import styles from './TopBlock.module.scss';

interface TextWrapperProps {
  title: string;
  items: string[];
  titleStyle?: React.CSSProperties;
  textStyle?: React.CSSProperties;
}

const TextWrapper: React.FC<TextWrapperProps> = ({ title, items, titleStyle, textStyle }) => {
  const handleItemClick = (item: string) => {
    if (item === 'Подобрать уход') {
      // Ссылка на Telegram бота
      window.open('https://t.me/Miraflores_Cosmetics_Bot', '_blank', 'noopener,noreferrer');
    } else if (item === 'Программа благодарности') {
      // Плавный скролл к блоку "Программа благодарности"
      const element = document.getElementById('gratitude-program');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (item === 'Шаг за шагом к чистой коже') {
      // Плавный скролл к блоку "КАЖДЫЙ ШАГ УСИЛИВАЕТ ПРЕДЫДУЩИЙ"
      const element = document.getElementById('steps-block');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleTitleClick = () => {
    if (title === 'Подобрать уход') {
      // Ссылка на Telegram бота
      window.open('https://t.me/Miraflores_Cosmetics_Bot', '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={styles.textWrapper}>
      <p 
        className={styles.textWrapperTitle} 
        style={titleStyle}
        onClick={title === 'Подобрать уход' ? handleTitleClick : undefined}
        role={title === 'Подобрать уход' ? 'button' : undefined}
        tabIndex={title === 'Подобрать уход' ? 0 : undefined}
        onKeyDown={title === 'Подобрать уход' ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTitleClick();
          }
        } : undefined}
      >
        {title}
      </p>
      {items.map((item, index) => (
        <p 
          key={index} 
          className={styles.textWrappertxt} 
          style={textStyle}
          onClick={() => handleItemClick(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleItemClick(item);
            }
          }}
        >
          {item}
        </p>
      ))}
    </div>
  );
};

export default TextWrapper;
