import { lazy, Suspense } from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';
import styles from './Product.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
const LazyComponent = lazy(() => import('./LazyComponent'));

const BestSeller: React.FC = () => {
  return (
    <>
      <Header />
      <article className={styles.bestSellerContainer}>
        <main>
          <Suspense fallback={<SpinnerLoader />}>
            <LazyComponent />
          </Suspense>
        </main>
        <Footer footerImage={footerImage} />
      </article>
    </>
  );
};

export default BestSeller;
