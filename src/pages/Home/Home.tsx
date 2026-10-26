import React, { Suspense, lazy, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Home.module.scss';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import AboutBlock from '@/components/AboutBlock';
import StepsBlock from '@/components/steps-block/StepsBlock';
import { InfoTest } from '@/components/take-test/InfoTestBlock';
import { HomeHero } from '@/components/home-hero/HomeHero';
import { HomePromoBanners } from '@/components/home-promo-banners/HomePromoBanners';
import { NewsletterEnvelope } from '@/components/newsletter-envelope/NewsletterEnvelope';
import { HomeNearViewport } from '@/components/home-section/HomeNearViewport';
import { scrollToAnchorWhenReady } from '@/utils/scrollToAnchor';
import { HomeCmsProvider } from '@/contexts/HomeCmsContext';
import { useHomeSeo } from './useHomeSeo';

const Sets = lazy(() =>
  import('@/components/sets/Sets').then((m) => ({ default: m.Sets })),
);
const Reviews = lazy(() =>
  import('@/components/take-test/reviews/Reviews').then((m) => ({ default: m.Reviews })),
);
const GratitudeProgram = lazy(() =>
  import('@/components/gratitude-program/GratitudeProgram').then((m) => ({
    default: m.GratitudeProgram,
  })),
);
const Awards = lazy(() =>
  import('@/components/awards/Awards').then((m) => ({ default: m.Awards })),
);
const FAQBlock = lazy(() =>
  import('@/components/faq-block/FAQBlock').then((m) => ({ default: m.FAQBlock })),
);

const Home: React.FC = () => {
  const location = useLocation();
  useHomeSeo();

  useEffect(() => {
    const id = location.hash.replace(/^#/, '').trim();
    if (!id) return;
    return scrollToAnchorWhenReady(id);
  }, [location.hash, location.pathname]);

  return (
    <HomeCmsProvider>
      <HomeHero />
      <main className={styles.homeContainer}>
        <Bestsellers />
        <HomePromoBanners />
        <HomeNearViewport minHeight={420}>
          <AboutBlock />
        </HomeNearViewport>
        <StepsBlock />
        <InfoTest />
        <HomeNearViewport minHeight={320}>
          <Suspense fallback={null}>
            <Sets />
          </Suspense>
        </HomeNearViewport>
        <HomeNearViewport minHeight={280}>
          <Suspense fallback={null}>
            <Reviews />
          </Suspense>
        </HomeNearViewport>
        <HomeNearViewport minHeight={400} rootMargin="560px 0px">
          <Suspense fallback={null}>
            <GratitudeProgram />
          </Suspense>
        </HomeNearViewport>
        <HomeNearViewport minHeight={360}>
          <Suspense fallback={null}>
            <Awards />
          </Suspense>
        </HomeNearViewport>
        <HomeNearViewport minHeight={240}>
          <Suspense fallback={null}>
            <FAQBlock />
          </Suspense>
        </HomeNearViewport>
        <NewsletterEnvelope />
      </main>
    </HomeCmsProvider>
  );
};

export default Home;
