/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import {
  ORDER_CHAT_OPEN_EVENT,
  openOrderChat,
} from '@/lib/orderChat/orderChatEvents';

describe('openOrderChat', () => {
  it('dispatches custom event with selection', () => {
    const handler = vi.fn();
    window.addEventListener(ORDER_CHAT_OPEN_EVENT, handler);
    openOrderChat({ selection: { kind: 'support' } });
    expect(handler).toHaveBeenCalledTimes(1);
    const ev = handler.mock.calls[0]![0] as CustomEvent;
    expect(ev.detail?.selection).toEqual({ kind: 'support' });
    window.removeEventListener(ORDER_CHAT_OPEN_EVENT, handler);
  });
});
