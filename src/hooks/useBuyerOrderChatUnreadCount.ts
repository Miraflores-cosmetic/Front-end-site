import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/api/apiClient';
import { ORDER_CHAT_UNREAD_REFRESH_EVENT } from '@/lib/orderChat/orderChatEvents';

export function useBuyerOrderChatUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const data = await apiFetch<{ count?: number }>('/account/chat/unread-count');
      setCount(typeof data.count === 'number' && data.count > 0 ? data.count : 0);
    } catch {
      setCount(0);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onRefresh = () => void refresh();
    window.addEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    const pollMs = 90_000;
    const tick = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    const onVis = () => tick();
    const onFocus = () => tick();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [enabled, refresh]);

  return { unreadCount: count, refreshUnreadCount: refresh };
}
