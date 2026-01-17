import React, { useEffect, useState } from 'react';
import styles from './AboutBlock.module.scss';
import AvoutCenter from '@/assets/images/AvoutCenter.webp';
import AboutRight from '@/assets/images/AboutRight.webp';
import AboutLeft from '@/assets/images/AboutLeft.png';
import arrowToRoght from '@/assets/icons/ArrowToRight.svg';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { Link } from 'react-router-dom';

const AboutText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={styles.text}>{children}</p>
);

const AboutImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={className || styles.smallImage} />
);

const AboutMore: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => (
  <div className={isMobile ? styles.mobileMore : styles.more}>
    <Link to='/about'>
      <p>БОЛЬШЕ О НАС</p>{' '}
      <img
        src={arrowToRoght}
        alt='arrowToRoght'
        className={isMobile ? styles.mobileArrowToRoght : styles.arrowToRoght}
      />
    </Link>
  </div>
);

const AboutBlock: React.FC = () => {
  const isTablet = useScreenMatch(1024);
  const isMobile = useScreenMatch(950);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const sectionRef = React.useRef<HTMLElement>(null);

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
      className={`${styles.about} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      aria-label="О нас"
    >
      <h2 className={styles.title}>
        ДОКАЗАНО. ЗАПАТЕНТОВАНО. <br /> СОЗДАНО С ЗАБОТОЙ.
      </h2>

      <div className={isMobile ? styles.containerMobile : styles.container}>
        <div className={styles.left}>
          <div className={styles.leftTop}>
            <AboutText>
              С 2007 года мы разрабатываем и производим безопасные и эффективные средства ухода. У
              нас полностью своё производство, включая выпуск собственных растительных ингредиентов:
              меристемных экстрактов, мацератов и гидролатов.
            </AboutText>
          </div>

          <div className={isMobile ? styles.mobileBottom : styles.leftBottom}>
            {!isMobile && !isTablet && <AboutImage src={AboutLeft} alt='LeftFoto' />}
            <AboutText>
              Мы уверены: природа уже создала всё необходимое для здоровья и красоты кожи — наша
              задача лишь научиться грамотно это использовать. В каждом средстве Miraflores — чистые
              формулы, запатентованные разработки и сила растений, раскрытая с научной точностью.
            </AboutText>
          </div>
        </div>

        {/* Center */}
        <div className={styles.center}>
          <AboutImage src={AvoutCenter} alt='CenterFoto' />
        </div>

        {/* Right Column */}
        <div className={styles.right}>
          <div className={styles.smallImageWrapper}>
            {!isMobile && !isTablet && <AboutImage src={AboutRight} alt='RightFoto' />}
          </div>

          <div className={isMobile ? styles.mobileTextWrapper : styles.textWrapper}>
            <AboutText>
              Выбирая осознанный уход, вы выбираете гармонию: между кожей, составом и окружающей
              средой.
            </AboutText>
            <AboutText>
              Miraflores — это качество, проверенное временем, и команда, которая по-настоящему
              влюблена в своё дело.
            </AboutText>
          </div>

          <AboutMore isMobile={isMobile} />
        </div>
      </div>
    </section>
  );
};

export default AboutBlock;
