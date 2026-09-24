import {
  createOrderChatSocketManager,
  type OrderChatSocket,
  type OrderChatWsAuth,
} from '@miraflores/order-chat-core';
import { apiFetch } from '@/api/apiClient';
import { getWsOrigin } from '@/lib/orderChat/wsOrigin';

const manager = createOrderChatSocketManager({
  getWsOrigin,
  loadIo: () => import('socket.io-client'),
  fetchWsToken: async () => {
    const j = await apiFetch<{ token?: string; sub?: string | null; exp?: number | null }>(
      '/account/chat/ws-token',
    );
    const token = j.token?.trim();
    if (!token) throw new Error('Нет токена для чата');
    const sub = j.sub === undefined || j.sub === null ? null : String(j.sub);
    let exp: number | null = null;
    if (typeof j.exp === 'number' && Number.isFinite(j.exp)) exp = j.exp;
    return { token, sub: sub === '' ? null : sub, exp };
  },
});

export type { OrderChatWsAuth, OrderChatSocket };

export const disposeSharedOrderChatSocket = () => manager.disposeSharedOrderChatSocket('account');
export const teardownOrderChatWsForLogout = () => manager.teardownOrderChatWsForLogout('account');
export const ORDER_CHAT_WS_SESSION_EXPIRED_EVENT = manager.ORDER_CHAT_WS_SESSION_EXPIRED_EVENT;
export const fetchBuyerOrderChatWsToken = () => manager.fetchWsToken('account');
export const waitOrderChatSocketConnect = manager.waitOrderChatSocketConnect;
export const emitOrderChatRoomJoin = manager.emitOrderChatRoomJoin;
export const getOrCreateSharedOrderChatSocket = (auth: OrderChatWsAuth) =>
  manager.getOrCreateSharedOrderChatSocket('account', auth);
export const registerOrderChatWsSession = (auth: OrderChatWsAuth) =>
  manager.registerOrderChatWsSession('account', auth);
