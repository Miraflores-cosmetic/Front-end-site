import React, { useEffect, useState } from 'react';
import styles from './Home.module.scss';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import AboutBlock from '@/components/AboutBlock';
import StepsBlock from '@/components/steps-block/StepsBlock';
import { InfoTest } from '@/components/take-test/InfoTestBlock';
import { Sets } from '@/components/sets/Sets';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import { GratitudeProgram } from '@/components/gratitude-program/GratitudeProgram';
import { Awards } from '@/components/awards/Awards';
import { HeroSlider } from '@/components/hero-slider/HeroSlider';
import { FAQBlock } from '@/components/faq-block/FAQBlock';
import footerImage from '@/assets/images/footer-img.png';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { getPreHeader, PageNode } from '@/graphql/queries/pages.service';


const Home: React.FC = () => {
  const isMobile = useScreenMatch(450);
  const [preHeader, setPreHeader] = useState<PageNode | null>(null);
  const [showPreHeader, setShowPreHeader] = useState(false);

  useEffect(() => {
    const fetchPreHeader = async () => {
      const data = await getPreHeader();
      setPreHeader(data);
    };
    fetchPreHeader();
  }, []);

  // Показываем PreHeader с задержкой после загрузки страницы
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreHeader(true);
    }, 1200); // Задержка 1.2s после загрузки страницы

    return () => clearTimeout(timer);
  }, []);

  // Парсим текст из content (EditorJS)
  const getPreHeaderText = (page: PageNode | null): string => {
    if (!page) return '';
    
    // Если есть title, используем его
    if (page.title) return page.title;
    
    // Иначе парсим content
    if (page.content) {
      try {
        const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
        if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
          return parsed.blocks
            .map((block: any) => {
              if (block.type === 'paragraph' && block.data?.text) {
                return block.data.text;
              }
              return '';
            })
            .filter((text: string) => text)
            .join(' ');
        }
      } catch {
        return typeof page.content === 'string' ? page.content : '';
      }
    }
    
    return '';
  };

  const preHeaderText = getPreHeaderText(preHeader);
  const preHeaderHeight = !isMobile && preHeaderText ? '27px' : '0px';

  useEffect(() => {
    document.documentElement.style.setProperty('--preheader-height', preHeaderHeight);
  }, [preHeaderHeight]);

  return (
    <>
      {/* PreHeader скрыт */}
      {/* {!isMobile && preHeaderText && showPreHeader && (
        <p className={styles.preHeaderTxt}>{preHeaderText}</p>
      )} */}
      <Header />
      <main className={styles.homeContainer}>
        <HeroSlider />
        <Bestsellers />
        <AboutBlock />
        <StepsBlock />
        <InfoTest />
        <Sets />
        <Reviews />
        <GratitudeProgram />
        <FAQBlock />
        <Awards />
        <Footer footerImage={footerImage} />
      </main>
    </>
  );
};

export default Home;
