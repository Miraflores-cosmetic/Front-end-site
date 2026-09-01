import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { CheckoutState } from '@/types/checkout';
import {
  addItemToCart,
  removeItemFromCart,
  increaseQuantity,
  decreaseQuantity,
  syncCartLines,
  initializeCart,
  revalidateVoucher,
} from './slices/checkoutSlice';

/** Revalidate voucher after cart mutations and hydrate from localStorage. */
export const checkoutListenerMiddleware = createListenerMiddleware();

checkoutListenerMiddleware.startListening({
  matcher: isAnyOf(
    addItemToCart,
    removeItemFromCart,
    increaseQuantity,
    decreaseQuantity,
    syncCartLines.fulfilled,
  ),
  effect: async (_action, api) => {
    api.cancelActiveListeners();
    await api.delay(250);
    const { voucherCode, lines } = (api.getState() as { checkout: CheckoutState }).checkout;
    if (!voucherCode || !lines.length) return;
    await api.dispatch(revalidateVoucher(undefined));
  },
});

checkoutListenerMiddleware.startListening({
  actionCreator: initializeCart.fulfilled,
  effect: async (action, api) => {
    if (!action.payload.voucherCode) return;
    await api.dispatch(revalidateVoucher(undefined));
  },
});
