/**
 * Единый скролл к якорю. Отступ задаётся CSS:
 * `scroll-margin-top` / `scroll-padding-top` =
 * `calc(var(--header-height) + var(--scroll-anchor-extra))`.
 */
export function scrollToAnchor(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: 'start' });
  return true;
}

/** Ждёт появления узла (async-секции вроде FAQ) и скроллит один раз. */
export function scrollToAnchorWhenReady(
  id: string,
  options?: { timeoutMs?: number; behavior?: ScrollBehavior },
): () => void {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const behavior = options?.behavior ?? 'smooth';
  let cancelled = false;
  let done = false;

  const tryScroll = () => {
    if (cancelled || done) return true;
    if (scrollToAnchor(id, behavior)) {
      done = true;
      return true;
    }
    return false;
  };

  if (tryScroll()) {
    return () => {
      cancelled = true;
    };
  }

  const intervalId = window.setInterval(() => {
    if (tryScroll()) window.clearInterval(intervalId);
  }, 100);

  const maxWait = window.setTimeout(() => {
    window.clearInterval(intervalId);
    tryScroll();
  }, timeoutMs);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
    window.clearTimeout(maxWait);
  };
}
