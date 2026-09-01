import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Home.module.scss';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import AboutBlock from '@/components/AboutBlock';
import StepsBlock from '@/components/steps-block/StepsBlock';
import { InfoTest } from '@/components/take-test/InfoTestBlock';
import { Sets } from '@/components/sets/Sets';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import { GratitudeProgram } from '@/components/gratitude-program/GratitudeProgram';
import { Awards } from '@/components/awards/Awards';
import { HomeHero } from '@/components/home-hero/HomeHero';
import { FAQBlock } from '@/components/faq-block/FAQBlock';
import { scrollToAnchorWhenReady } from '@/utils/scrollToAnchor';
import { useHomeSeo } from './useHomeSeo';

const Home: React.FC = () => {
  const location = useLocation();
  useHomeSeo();

  useEffect(() => {
    const id = location.hash.replace(/^#/, '').trim();
    if (!id) return;
    return scrollToAnchorWhenReady(id);
  }, [location.hash, location.pathname]);

  return (
    <>
      <HomeHero />
      <main className={styles.homeContainer}>
        <Bestsellers />
        <AboutBlock />
        <StepsBlock />
        <InfoTest />
        <Sets />
        <Reviews />
        <GratitudeProgram />
        <Awards />
        <FAQBlock />
      </main>
    </>
  );
};

export default Home;
