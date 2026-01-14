import { lazy, Suspense } from 'react';
import styles from './SignIn.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
const LazyComponent = lazy(() => import('./LazyComponent'));

const SignIn: React.FC = () => {
  return (
    <section className={styles.signInContainer}>   
      <Suspense fallback={<SpinnerLoader />}>
        <LazyComponent />
      </Suspense>
    </section>
  );
};

export default SignIn;
