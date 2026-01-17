import React, { useEffect, useState, useRef } from 'react';
import styles from './InfoTestBlock.module.scss';
import flower from '@/assets/images/romashka.png';

export const InfoTest: React.FC = () => {
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection Observer для запуска анимации при скролле к секции
  useEffect(() => {
    if (!sectionRef.current || isSectionLoaded) return;

    // Проверяем, видна ли секция сразу при загрузке
    const checkVisibility = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        return isVisible;
      }
      return false;
    };

    // Проверяем сразу
    if (checkVisibility()) {
      setIsSectionLoaded(true);
      return;
    }

    // Небольшая задержка для повторной проверки (на случай если DOM еще не готов)
    const timer = setTimeout(() => {
      if (checkVisibility()) {
        setIsSectionLoaded(true);
        return;
      }
    }, 100);

    // Создаем Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Если секция видна в viewport, запускаем анимацию
          if (entry.isIntersecting && !isSectionLoaded) {
            setIsSectionLoaded(true);
          }
        });
      },
      {
        // Запускаем анимацию когда секция видна на 20%
        threshold: 0.2,
        // Небольшой отступ сверху для более раннего запуска
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isSectionLoaded]);

  return (
    <section 
      ref={sectionRef}
      className={`${styles.infoTest} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      aria-label="Информация о тесте"
    >
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
