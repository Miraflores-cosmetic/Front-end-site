import React from 'react';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './Catalog.module.scss';

import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import CatalogList from '@/components/catalog-list/CatalogList';
import Layout from '@/components/Layout/Layout';
import { useScreenMatch } from '@/hooks/useScreenMatch';


const Catalog: React.FC = () => {
  const location = useLocation();
  const isMobile = useScreenMatch(768);

  useEffect(() => {
    // Если есть hash в URL, скроллим к элементу
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: isMobile ? 'auto' : 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      // Если нет hash, скроллим наверх
      window.scrollTo({ top: 0, behavior: isMobile ? 'auto' : 'smooth' });
    }
  }, [location, isMobile]);


  return (
    <>
      <Header />
      <main className={styles.faceContainer}>
        <Layout>
          <p className={styles.title}>Каталог</p>
          <CatalogList />
          <Bestsellers isCatalogPage />
        </Layout>
        <Footer footerImage={footerImage} />
      </main>
    </>
  );
};

export default Catalog;
