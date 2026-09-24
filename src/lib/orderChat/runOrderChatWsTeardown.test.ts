/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/orderChat/orderChatWsShared', () => ({
  teardownOrderChatWsForLogout: vi.fn(),
}));

describe('runOrderChatWsTeardown', () => {
  it('dynamic-imports ws shared and calls teardown', async () => {
    vi.resetModules();
    const shared = await import('@/lib/orderChat/orderChatWsShared');
    const { runOrderChatWsTeardown } = await import('@/lib/orderChat/runOrderChatWsTeardown');
    await runOrderChatWsTeardown();
    expect(shared.teardownOrderChatWsForLogout).toHaveBeenCalled();
  });
});
