import React from 'react';
import styles from './AboutBlock.module.scss';
import AvoutCenter from '@/assets/images/AvoutCenter.webp';
import aboutVideo from '@/assets/videos/about-center.mp4';
import AboutRight from '@/assets/images/AboutRight.webp';
import AboutLeft from '@/assets/images/AboutLeft.png';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { VIEWPORT_TABLET_MAX } from '@/constants/viewport';
import MoreLink, { SectionTitleRow } from '@/components/MoreLink/MoreLink';
import { HomeSection } from '@/components/home-section/HomeSection';

const AboutText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={styles.text}>{children}</p>
);

const AboutImage: React.FC<{
  src: string;
  className?: string;
}> = ({ src, className }) => (
  <img src={src} alt="" aria-hidden className={className || styles.smallImage} />
);

const AboutBlock: React.FC = () => {
  const isTablet = useScreenMatch(VIEWPORT_TABLET_MAX);
  const isMobile = useScreenMatch();

  return (
    <HomeSection className={styles.about} aria-label="О нас">
      <SectionTitleRow className={styles.titleRow}>
        <h2 className={styles.title}>
          ДОКАЗАНО. ЗАПАТЕНТОВАНО. <br /> СОЗДАНО С ЗАБОТОЙ.
        </h2>
        <MoreLink to="/about">{isMobile ? 'о нас' : 'больше о нас'}</MoreLink>
      </SectionTitleRow>

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
            {!isMobile && !isTablet && <AboutImage src={AboutLeft} />}
            <AboutText>
              Мы уверены: природа уже создала всё необходимое для здоровья и красоты кожи — наша
              задача лишь научиться грамотно это использовать. В каждом средстве Miraflores — чистые
              формулы, запатентованные разработки и сила растений, раскрытая с научной точностью.
            </AboutText>
          </div>
        </div>

        <div className={styles.center}>
          <video
            src={aboutVideo}
            poster={AvoutCenter}
            muted
            autoPlay
            loop
            playsInline
            preload="none"
            className={styles.centerVideo}
            aria-label="О компании Miraflores"
          />
        </div>

        <div className={styles.right}>
          <div className={styles.smallImageWrapper}>
            {!isMobile && !isTablet && <AboutImage src={AboutRight} />}
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
        </div>
      </div>
    </HomeSection>
  );
};

export default AboutBlock;
