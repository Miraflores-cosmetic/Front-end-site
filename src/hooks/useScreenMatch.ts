import { useState, useEffect } from 'react';
import { VIEWPORT_MOBILE_MAX } from '@/constants/viewport';

export function useScreenMatch(maxWidth: number = VIEWPORT_MOBILE_MAX) {
  const [isScreenMatch, setScreenMatch] = useState(
    typeof window !== 'undefined' ? window.innerWidth < maxWidth : false
  );

  useEffect(() => {
    const handleResize = () => {
      setScreenMatch(window.innerWidth < maxWidth);
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [maxWidth]);

  return isScreenMatch;
}
