import { lazy, Suspense } from 'react';
import styles from './SignUp.module.scss';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
const LazyComponent = lazy(() => import('./LazyComponent'));

const SignUp: React.FC = () => {
  return (
    <section className={styles.signUpContainer}>
      <Suspense fallback={<SpinnerLoader />}>
        <LazyComponent />
      </Suspense>
    </section>
  );
};

export default SignUp;
