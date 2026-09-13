import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackHit } from '@/lib/metrika';

/** SPA pageviews для Яндекс.Метрики. */
export function MetrikaRouteTracker() {
  const location = useLocation();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const url = `${location.pathname}${location.search}${location.hash}`;
    // Первый hit уже даёт тег Метрики; дальше — смены маршрута.
    if (prevPath.current === null) {
      prevPath.current = url;
      return;
    }
    if (prevPath.current === url) return;
    const referer = prevPath.current;
    prevPath.current = url;
    trackHit(url, { referer: `${window.location.origin}${referer}` });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
