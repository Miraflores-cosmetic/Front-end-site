import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import styles from './Product.module.scss';
import LazyComponent from './LazyComponent';

const BestSeller: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Прокручиваем страницу вверх при монтировании или изменении slug
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <>
      <Header />
      <article className={styles.bestSellerContainer}>
        <main>
          <LazyComponent />
        </main>
        <Footer footerImage={footerImage} />
      </article>
    </>
  );
};

export default BestSeller;
