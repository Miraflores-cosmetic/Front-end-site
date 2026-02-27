import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './ReviewsPage.module.scss';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';

const ReviewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productSlug = searchParams.get('product') ?? undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className={styles.reviewsPage}>
        <Reviews variant="page" productSlug={productSlug} />
        <Footer footerImage={footerImage} />
      </main>
    </>
  );
};

export default ReviewsPage;
