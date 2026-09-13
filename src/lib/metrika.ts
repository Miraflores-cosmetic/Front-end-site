/**
 * Яндекс.Метрика (счётчик + JS-цели).
 * В кабинете Метрики создайте цели типа «JavaScript-событие» с теми же id.
 */

export const YANDEX_METRIKA_ID = Number(
  import.meta.env.VITE_YANDEX_METRIKA_ID || 112462177,
);

/** Идентификаторы целей — совпадают с настройками в Метрике. */
export const MetrikaGoal = {
  pdpOpen: 'pdp_open',
  addToCart: 'add_to_cart',
  cartView: 'cart_view',
  paymentOpen: 'payment_open',
  purchase: 'purchase',
  purchaseWithoutPdp: 'purchase_without_pdp',
  promoFieldOpen: 'promo_field_open',
  addToFavorites: 'add_to_favorites',
  purchaseFromFavorites: 'purchase_from_favorites',
  quizComplete: 'quiz_complete',
  newsletterSubscribe: 'newsletter_subscribe',
} as const;

export type MetrikaGoalId = (typeof MetrikaGoal)[keyof typeof MetrikaGoal];

const SS_PDP = 'mira_ym_pdp_visited';
const SS_FAV_CART = 'mira_ym_cart_from_favorites';

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function reachGoal(goal: MetrikaGoalId, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return;
  try {
    if (params) window.ym(YANDEX_METRIKA_ID, 'reachGoal', goal, params);
    else window.ym(YANDEX_METRIKA_ID, 'reachGoal', goal);
  } catch {
    /* ignore */
  }
}

/** SPA hit при смене маршрута. */
export function trackHit(url: string, opts?: { title?: string; referer?: string }): void {
  if (typeof window === 'undefined' || typeof window.ym !== 'function') return;
  try {
    window.ym(YANDEX_METRIKA_ID, 'hit', url, {
      title: opts?.title ?? document.title,
      referer: opts?.referer,
    });
  } catch {
    /* ignore */
  }
}

export function markPdpVisited(): void {
  try {
    sessionStorage.setItem(SS_PDP, '1');
  } catch {
    /* ignore */
  }
}

export function hasVisitedPdp(): boolean {
  try {
    return sessionStorage.getItem(SS_PDP) === '1';
  } catch {
    return false;
  }
}

export function markCartFromFavorites(): void {
  try {
    sessionStorage.setItem(SS_FAV_CART, '1');
  } catch {
    /* ignore */
  }
}

export function wasCartFromFavorites(): boolean {
  try {
    return sessionStorage.getItem(SS_FAV_CART) === '1';
  } catch {
    return false;
  }
}

export function clearPurchaseSessionFlags(): void {
  try {
    sessionStorage.removeItem(SS_FAV_CART);
  } catch {
    /* ignore */
  }
}

/** Путь профиля «Избранное». */
export function isFavoritesPathStrict(pathname: string, search: string): boolean {
  if (!pathname.startsWith('/profile')) return false;
  return new URLSearchParams(search).get('tab') === 'favorites';
}
