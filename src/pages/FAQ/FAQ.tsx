import React from 'react';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './FAQ.module.scss';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';
import { FAQBlock } from '@/components/faq-block/FAQBlock';

const FAQ: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Если есть hash в URL, скроллим к элементу
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      // Если нет hash, скроллим наверх
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  return (
    <main className={styles.faqPageContainer}>
      <Header />
      <div className={styles.contentWrapper}>
        <FAQBlock />
      </div>
      <Footer footerImage={footerImage} />
    </main>
  );
};

export default FAQ;
