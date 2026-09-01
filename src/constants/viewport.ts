/**
 * Единые пороги для `useScreenMatch(max)` — true при `max-width: ${max}px`
 * (как CSS `@media (max-width: …)`).
 *
 * - VIEWPORT_MOBILE_MAX — контентные мобильные раскладки страниц
 * - VIEWPORT_TABLET_MAX — chrome навигации (header/menu): tablet = mobile nav
 */
export const VIEWPORT_MOBILE_MAX = 768;

/** Header / menu drawer: ниже этого порога — burger + mobile menu actions */
export const VIEWPORT_TABLET_MAX = 1024;
