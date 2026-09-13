import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import type { CheckoutState } from '@/types/checkout';
import { abandonOrder } from '@/api/ordersApi';
import {
  clearPendingCheckoutOrder,
  readPendingCheckoutOrder,
} from '@/utils/pendingCheckoutOrder';
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

/**
 * Любая правка корзины → сбрасываем soft-kept pending order/payment.
 * Иначе «Оплатить позже» + смена qty → pay reuse отдаёт confirmationToken
 * ЮKassa со суммой предыдущей итерации.
 */
async function invalidatePendingAfterCartEdit() {
  if (typeof sessionStorage === 'undefined') return;
  const pending = readPendingCheckoutOrder();
  if (!pending) return;
  clearPendingCheckoutOrder();
  try {
    await abandonOrder(pending.orderId, pending.payToken);
  } catch {
    // TTL / expire подчистит; не блокируем UI корзины
  }
}

checkoutListenerMiddleware.startListening({
  matcher: isAnyOf(
    addItemToCart,
    removeItemFromCart,
    increaseQuantity,
    decreaseQuantity,
  ),
  effect: async () => {
    await invalidatePendingAfterCartEdit();
  },
});

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
