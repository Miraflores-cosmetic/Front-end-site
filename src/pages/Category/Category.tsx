import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Category.module.scss';
import Header from '@/components/Header/Header';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
const LazyComponent = lazy(() => import('./LazyComponent'));

const Category: React.FC = () => {
  const { slug } = useParams();
  const sectionRef = useRef<HTMLElement>(null);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);

  // При монтировании и при смене категории (slug) — прокрутка в самый верх
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const checkVisible = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };

    if (checkVisible()) {
      setIsSectionLoaded(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setIsSectionLoaded(true);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <section
        ref={sectionRef}
        className={`${styles.faceContainer} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
      >
        <Suspense fallback={<SpinnerLoader />}>
          <LazyComponent />
        </Suspense>
      </section>
    </>
  );
};

export default Category;