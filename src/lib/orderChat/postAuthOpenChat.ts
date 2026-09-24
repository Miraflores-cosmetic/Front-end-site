import type { OrderChatOpenDetail } from '@/lib/orderChat/orderChatEvents';

const STORAGE_KEY = 'miraflores_post_auth_open_chat';

export function stashPostAuthOpenChat(detail?: OrderChatOpenDetail): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(detail ?? {}));
}

export function consumePostAuthOpenChat(): OrderChatOpenDetail | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as OrderChatOpenDetail;
  } catch {
    return undefined;
  }
}
