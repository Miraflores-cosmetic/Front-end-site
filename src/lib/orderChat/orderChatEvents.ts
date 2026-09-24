export const ORDER_CHAT_OPEN_EVENT = 'miraflores:order-chat-open';

export type BuyerOrderChatSelection =
  | { kind: 'support' }
  | { kind: 'order'; orderId: string; title?: string };

export type OrderChatOpenDetail = {
  selection?: BuyerOrderChatSelection;
};

/** Сохраняется до монтирования виджета (deep-link из Profile раньше в дереве). */
let pendingOpenDetail: OrderChatOpenDetail | undefined;

export function openOrderChat(detail?: OrderChatOpenDetail): void {
  if (typeof window === 'undefined') return;
  const payload = detail ?? {};
  pendingOpenDetail = payload;
  window.dispatchEvent(new CustomEvent(ORDER_CHAT_OPEN_EVENT, { detail: payload }));
}

/** Забрать отложенное открытие (один раз). */
export function takePendingOrderChatOpen(): OrderChatOpenDetail | undefined {
  const d = pendingOpenDetail;
  pendingOpenDetail = undefined;
  return d;
}

export const ORDER_CHAT_UNREAD_REFRESH_EVENT = 'miraflores:order-chat-unread-refresh';

export function dispatchOrderChatUnreadRefresh(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ORDER_CHAT_UNREAD_REFRESH_EVENT));
}
