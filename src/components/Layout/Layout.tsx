import React, { useEffect, useRef, useState } from 'react';
import styles from './Layout.module.scss';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);

  useEffect(() => {
    const el = layoutRef.current;
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
    <div
      ref={layoutRef}
      className={`${styles.layout} ${isSectionLoaded ? styles.sectionAnimated : ''}`}
    >
      {children}
    </div>
  );
};

export default Layout;
