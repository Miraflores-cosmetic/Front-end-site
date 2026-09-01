import { loadAnime } from '@/lib/anime';

export const LOGO_WAVE_STAGGER_MS = 40;
export const LOGO_WAVE_IN_DURATION = 600;
export const LOGO_WAVE_OUT_DURATION = 480;
export const LOGO_WAVE_LETTER_SELECTOR = '.logo-wave__letter';
const LOGO_ASPECT = 36 / 179;

export { loadAnime };

export function preloadLogoWaveAnime() {
  return loadAnime();
}

export function logoWaveLetters(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(LOGO_WAVE_LETTER_SELECTOR));
}

function logoWaveMeasureEl(root: HTMLElement): HTMLElement {
  return root.querySelector<HTMLElement>('.logo-wave') ?? root;
}

/** Distance that fully clears the clip — based on rendered logo-wave height. */
export function logoWaveDistance(root: HTMLElement): number {
  const el = logoWaveMeasureEl(root);
  let h = el.getBoundingClientRect().height || el.offsetHeight || 0;
  if (h <= 0) {
    const w = el.getBoundingClientRect().width || el.offsetWidth || 0;
    if (w > 0) h = w * LOGO_ASPECT;
  }
  if (h > 0) return Math.ceil(h * 1.5);
  return 80;
}

export function prepareLogoWaveIn(root: HTMLElement, distancePx?: number) {
  const letters = logoWaveLetters(root);
  const dist = distancePx ?? logoWaveDistance(root);
  for (const el of letters) {
    el.style.transform = `translate3d(0, ${dist}px, 0)`;
  }
  return { letters, dist };
}

/** Сброс inline-transform после wave или отмены анимации. */
export function resetLogoWaveVisible(root: HTMLElement) {
  for (const el of logoWaveLetters(root)) {
    el.style.transform = '';
  }
}

export async function animateLogoWaveIn(
  root: HTMLElement,
  distancePx?: number,
): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    resetLogoWaveVisible(root);
    return;
  }

  const { animate, stagger } = await preloadLogoWaveAnime();
  const { letters, dist } = prepareLogoWaveIn(root, distancePx);
  if (!letters.length) return;

  try {
    await animate(letters, {
      y: [dist, 0],
      duration: LOGO_WAVE_IN_DURATION,
      ease: 'outCubic',
      delay: stagger(LOGO_WAVE_STAGGER_MS),
    });
  } finally {
    for (const el of letters) {
      el.style.transform = 'translate3d(0, 0, 0)';
    }
  }
}

export async function animateLogoWaveOut(
  root: HTMLElement,
  distancePx?: number,
): Promise<void> {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    resetLogoWaveVisible(root);
    return;
  }

  const letters = logoWaveLetters(root);
  if (!letters.length) return;
  const dist = distancePx ?? logoWaveDistance(root);
  const { animate, stagger } = await preloadLogoWaveAnime();
  await animate(letters, {
    y: [0, dist],
    duration: LOGO_WAVE_OUT_DURATION,
    ease: 'inQuad',
    delay: stagger(LOGO_WAVE_STAGGER_MS),
  });
}
