import React, { useEffect, useRef, useState } from 'react';
import styles from './Layout.module.scss';
import { useScreenMatch } from '@/hooks/useScreenMatch';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const [isSectionLoaded, setIsSectionLoaded] = useState(false);
  const isMobile = useScreenMatch();

  useEffect(() => {
    // На мобилке reveal-анимация может блокировать первый скролл (особенно при смене направления на iOS).
    // Поэтому сразу считаем секцию загруженной и не используем IntersectionObserver.
    if (isMobile) {
      setIsSectionLoaded(true);
      return;
    }

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
  }, [isMobile]);

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
