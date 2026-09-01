import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LogoPaths } from './LogoPaths';
import {
  animateLogoWaveIn,
  animateLogoWaveOut,
  logoWaveDistance,
  preloadLogoWaveAnime,
  prepareLogoWaveIn,
  resetLogoWaveVisible,
} from './logoWave';
import styles from './SiteLoader.module.scss';

const BOOT_LOADER_ID = 'site-boot-loader';

const HOLD_AFTER_IN_MS = 280;
const BG_COLLAPSE_MS = 650;
/** If JS/chunks stall (slow network), do not block the site behind the loader forever. */
const LOADER_MAX_MS = 8000;

function isHomePath(pathname: string) {
  return pathname === '/' || pathname === '';
}

function removeBootLoader() {
  try {
    document.getElementById(BOOT_LOADER_ID)?.remove();
  } catch {
    /* ignore */
  }
}

function markReady() {
  document.body.classList.add('--js-ready');
}

function animateBgCollapse(bgEl: HTMLElement): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    bgEl.style.transform = 'translate3d(0, 100%, 0)';
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      bgEl.removeEventListener('animationend', onEnd);
      window.clearTimeout(fallback);
      resolve();
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target !== bgEl) return;
      finish();
    };
    const fallback = window.setTimeout(finish, BG_COLLAPSE_MS + 80);
    bgEl.addEventListener('animationend', onEnd);
    bgEl.classList.add(styles.bgOut);
  });
}

/** Ждём первый layout Hero — параллельно со шторкой, без блокировки wave-out. */
function waitForHomePaint(timeoutMs = 1200): Promise<void> {
  return new Promise((resolve) => {
    const deadline = performance.now() + timeoutMs;
    const check = () => {
      const hero = document.querySelector('[data-home-hero]');
      if (hero && hero.getBoundingClientRect().height > 0) {
        resolve();
        return;
      }
      if (performance.now() >= deadline) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

/**
 * Полноэкранный preloader с волной лого — только при первом заходе на Home.
 * На остальных маршрутах сразу снимаем boot-loader и открываем страницу.
 */
export function SiteLoader() {
  const { pathname } = useLocation();
  const [enabled] = useState(() => isHomePath(pathname));
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [shouldShow, setShouldShow] = useState(false);

  useLayoutEffect(() => {
    removeBootLoader();
    if (!enabled) {
      markReady();
      return;
    }
    void preloadLogoWaveAnime();
    void import('@/pages/Home/Home');
    void import('@/components/home-hero/HomeHero');
    setShouldShow(true);
  }, [enabled]);

  /* Спрятать лого до первой отрисовки — иначе один кадр «вспышки». */
  useLayoutEffect(() => {
    if (!enabled || !shouldShow || !logoRef.current) return;
    const distance = logoWaveDistance(logoRef.current);
    prepareLogoWaveIn(logoRef.current, distance);
  }, [enabled, shouldShow]);

  useEffect(() => {
    if (!enabled || !shouldShow || !rootRef.current || !bgRef.current || !logoRef.current) {
      return;
    }

    let cancelled = false;
    let contentReady = false;
    const logoEl = logoRef.current;

    const ensureContentReady = () => {
      if (contentReady) return;
      contentReady = true;
      markReady();
    };

    const finishLoader = () => {
      if (cancelled) return;
      ensureContentReady();
      destroy();
    };

    const maxTimer = window.setTimeout(finishLoader, LOADER_MAX_MS);

    const runSequence = async () => {
      const bgEl = bgRef.current;
      if (!logoEl || !bgEl || cancelled) return;

      try {
        await preloadLogoWaveAnime();
        if (cancelled) return;

        const distance = logoWaveDistance(logoEl);
        await animateLogoWaveIn(logoEl, distance);
        if (cancelled) return;

        await new Promise((r) => setTimeout(r, HOLD_AFTER_IN_MS));
        if (cancelled) return;

        await animateLogoWaveOut(logoEl, distance);
        if (cancelled) return;

        /* Mount только после wave-out; шторка (CSS) + paint Hero параллельно. */
        ensureContentReady();
        await Promise.all([animateBgCollapse(bgEl), waitForHomePaint()]);
      } catch {
        /* chunk/network failure — fall through to finishLoader */
      }
      if (!cancelled) finishLoader();
    };

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void runSequence();
      });
    });

    function destroy() {
      const el = rootRef.current;
      if (!el) return;
      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';
      setShouldShow(false);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(maxTimer);
      cancelAnimationFrame(frame);
      resetLogoWaveVisible(logoEl);
    };
  }, [enabled, shouldShow]);

  if (!enabled || !shouldShow) return null;

  return (
    <div
      className={styles.siteLoader}
      data-site-loader
      aria-hidden="true"
      ref={rootRef}
    >
      <div className={styles.bg} ref={bgRef} />
      <div className={styles.logo} ref={logoRef}>
        <LogoPaths />
      </div>
    </div>
  );
}
