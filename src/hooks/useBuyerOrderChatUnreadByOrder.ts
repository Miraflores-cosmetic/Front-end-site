import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/api/apiClient';
import { ORDER_CHAT_UNREAD_REFRESH_EVENT } from '@/lib/orderChat/orderChatEvents';
import type { OrderChatThreadsResponse } from '@/lib/orderChat/types';

/** orderId → непрочитанные сообщения поддержки в чате по заказу. */
export function useBuyerOrderChatUnreadByOrder(enabled: boolean): Record<string, number> {
  const [byOrder, setByOrder] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!enabled) {
      setByOrder({});
      return;
    }
    try {
      const data = await apiFetch<OrderChatThreadsResponse>('/account/chat/threads');
      const next: Record<string, number> = {};
      for (const t of data.threads ?? []) {
        if (t.kind === 'ORDER' && t.orderId && t.unreadCount > 0) next[t.orderId] = t.unreadCount;
      }
      setByOrder(next);
    } catch {
      /* бейджи — вспомогательная информация, ошибку не показываем */
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 400);
    };
    window.addEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    };
  }, [enabled, refresh]);

  return byOrder;
}
