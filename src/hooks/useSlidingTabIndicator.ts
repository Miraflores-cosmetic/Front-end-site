import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Sliding underline for tablists (Win-Win ScrollCatalog pattern):
 * CSS vars --tabs-indicator-x / --tabs-indicator-w follow active or hovered tab.
 */
export function useSlidingTabIndicator(activeKey: string | null) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const targetKey = hoverKey ?? activeKey;

  const setBtnRef = useCallback((key: string) => {
    return (el: HTMLElement | null) => {
      if (!el) btnRefs.current.delete(key);
      else btnRefs.current.set(key, el);
    };
  }, []);

  const updateIndicator = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const btn = targetKey ? btnRefs.current.get(targetKey) : null;
    if (!btn) {
      wrap.style.setProperty('--tabs-indicator-x', '0px');
      wrap.style.setProperty('--tabs-indicator-w', '0px');
      return;
    }
    wrap.style.setProperty('--tabs-indicator-x', `${Math.max(0, btn.offsetLeft)}px`);
    wrap.style.setProperty('--tabs-indicator-w', `${Math.max(0, btn.offsetWidth)}px`);
  }, [targetKey]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, activeKey, hoverKey]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const sync = () => updateIndicator();
    const ro = new ResizeObserver(sync);
    ro.observe(wrap);
    wrap.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
    return () => {
      ro.disconnect();
      wrap.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [updateIndicator]);

  return {
    wrapRef,
    setBtnRef,
    setHoverKey,
    onWrapperMouseLeave: () => setHoverKey(null),
  };
}
