import { useEffect, useState } from 'react';

/** Дровер / модалка с body overflow hidden — прячем FAB чата. */
export function useSiteOverlayBlocksUiChrome(): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => {
      setBlocked(
        document.body.classList.contains('drawer-open') ||
          document.body.classList.contains('order-chat-modal-open') ||
          document.body.style.overflow === 'hidden',
      );
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    return () => mo.disconnect();
  }, []);

  return blocked;
}
