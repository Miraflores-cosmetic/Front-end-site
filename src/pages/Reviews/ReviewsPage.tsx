import React, { useEffect } from 'react';
import styles from './ReviewsPage.module.scss';
import { Reviews } from '@/components/take-test/reviews/Reviews';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';

const ReviewsPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main className={styles.reviewsPage}>
        <Reviews variant="page" />
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default ReviewsPage;
