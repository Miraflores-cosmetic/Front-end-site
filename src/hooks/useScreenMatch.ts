import { useState, useEffect } from 'react';
import { VIEWPORT_MOBILE_MAX } from '@/constants/viewport';

/**
 * True when viewport matches CSS `@media (max-width: ${maxWidth}px)`.
 * Uses matchMedia — at exactly 768px both JS and SCSS are mobile (not `width < 768`).
 */
export function useScreenMatch(maxWidth: number = VIEWPORT_MOBILE_MAX) {
  const query = `(max-width: ${maxWidth}px)`;

  const [isScreenMatch, setScreenMatch] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setScreenMatch(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isScreenMatch;
}
