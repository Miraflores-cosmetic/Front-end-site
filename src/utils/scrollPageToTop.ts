/** Сбрасывает скролл окна и корневых элементов (в т.ч. после смены layout). */
export function scrollPageToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Двойной rAF — после отрисовки контента и анимаций header/layout. */
export function scrollPageToTopAfterLayout(): void {
  scrollPageToTop();
  requestAnimationFrame(() => {
    scrollPageToTop();
    requestAnimationFrame(scrollPageToTop);
  });
}
