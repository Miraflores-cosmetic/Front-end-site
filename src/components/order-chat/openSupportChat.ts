import { openOrderChat } from '@/lib/orderChat/orderChatEvents';

/** Открыть общий чат поддержки (гость → sign-in через OrderChatWidget). */
export function openSupportChat(): void {
  openOrderChat({ selection: { kind: 'support' } });
}
