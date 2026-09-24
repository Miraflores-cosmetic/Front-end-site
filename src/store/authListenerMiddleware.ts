import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { logout, clearLocalSession } from '@/store/slices/authSlice';
import { runOrderChatWsTeardown } from '@/lib/orderChat/runOrderChatWsTeardown';

export const authListenerMiddleware = createListenerMiddleware();

authListenerMiddleware.startListening({
  matcher: isAnyOf(logout.fulfilled, clearLocalSession),
  effect: async () => {
    await runOrderChatWsTeardown();
  },
});
