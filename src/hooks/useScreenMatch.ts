import { useState, useEffect } from 'react';

export function useScreenMatch(maxWidth: number = 450) {
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
