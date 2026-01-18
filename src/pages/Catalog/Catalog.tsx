import React from 'react';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import styles from './Catalog.module.scss';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import krem from '@/assets/images/krem.webp';
import krem2 from '@/assets/images/krem2.webp';
import Ellipse from '@/assets/images/Ellipse.webp';
import footerImageCatalog from '@/assets/images/footerImageCatalog.webp';
import kremgroup from '@/assets/images/kremGroupElipse.webp';
import girlwithsmile from '@/assets/images/girlsmile.webp';
import Bestsellers from '@/components/bestsellers/Bestsellers';
import CatalogList from '@/components/catalog-list/CatalogList';
import Layout from '@/components/Layout/Layout';


const Catalog: React.FC = () => {
  const isMobile = useScreenMatch(768);
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
    <>
      <Header />
      <main className={styles.catalogContainer}>
        <Layout>
          <p className={styles.title}>Каталог</p>
          {isMobile && (
            <div className={styles.elipseWrapper}>
              <img src={Ellipse} alt='Ellipse' className={styles.elipsImage} />
              <img src={kremgroup} alt='kremgroup' className={styles.kremgroup} />
              <p className={styles.name}>Наборы</p>
            </div>
          )}

          <CatalogList />
          <Bestsellers isCatalogPage />
        </Layout>
        <Footer footerImage={footerImageCatalog} />
      </main>
    </>
  );
};

export default Catalog;
