import { lazy, Suspense } from 'react';
import styles from './Category.module.scss';
import Header from '@/components/Header/Header';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
const LazyComponent = lazy(() => import('./LazyComponent'));

const Category: React.FC = () => {
  return (
    <section className={styles.faceContainer}> 
        <Header />  
      <Suspense fallback={<SpinnerLoader />}>
        <LazyComponent />
      </Suspense>
    </section>
  );
};

export default Category;