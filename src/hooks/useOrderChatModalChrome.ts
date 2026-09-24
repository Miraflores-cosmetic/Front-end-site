import { useEffect } from 'react';

const BODY_CLASS = 'order-chat-modal-open';

/** Блокировка скролла страницы и высота под iOS-клавиатуру (как search drawer). */
export function useOrderChatModalChrome(open: boolean): void {
  useEffect(() => {
    if (typeof document === 'undefined' || !open) return undefined;

    const root = document.documentElement;
    const syncVvh = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty('--order-chat-vvh', `${Math.round(h)}px`);
      if (vv) {
        root.style.setProperty('--order-chat-vv-offset-top', `${Math.round(vv.offsetTop)}px`);
      }
    };

    document.body.classList.add(BODY_CLASS);
    syncVvh();
    window.visualViewport?.addEventListener('resize', syncVvh);
    window.visualViewport?.addEventListener('scroll', syncVvh);
    window.addEventListener('resize', syncVvh);

    return () => {
      document.body.classList.remove(BODY_CLASS);
      root.style.removeProperty('--order-chat-vvh');
      root.style.removeProperty('--order-chat-vv-offset-top');
      window.visualViewport?.removeEventListener('resize', syncVvh);
      window.visualViewport?.removeEventListener('scroll', syncVvh);
      window.removeEventListener('resize', syncVvh);
    };
  }, [open]);
}
