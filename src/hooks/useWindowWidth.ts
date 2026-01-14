import { useState, useEffect } from 'react';

export function useWindowWidth() {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }

    window.addEventListener('resize', handleResize);
    handleResize(); // установить начальное значение

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
