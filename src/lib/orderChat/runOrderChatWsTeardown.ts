/** Logout/session clear: не тянуть socket.io-client в authSlice. */
export async function runOrderChatWsTeardown(): Promise<void> {
  if (typeof window === 'undefined') return;
  const { teardownOrderChatWsForLogout } = await import('@/lib/orderChat/orderChatWsShared');
  teardownOrderChatWsForLogout();
}
