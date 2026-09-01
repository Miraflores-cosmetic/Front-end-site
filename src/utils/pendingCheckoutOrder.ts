/** Session keys for in-progress checkout payment (same browser tab only).
 *
 * payToken живёт только в sessionStorage — не в URL/query (history, Referer, logs).
 * Return YooKassa в другой вкладке/браузере без этого session → OrderSuccess не
 * подтвердит оплату («подтвердите в этой вкладке»). Guest cross-device без
 * query-token осознанно невозможен (security tradeoff).
 */
export const PENDING_ORDER_ID_KEY = 'jcos.pendingOrderId';
export const PENDING_ORDER_NUMBER_KEY = 'jcos.pendingOrderNumber';
export const PENDING_PAY_TOKEN_KEY = 'jcos.pendingPayToken';
export const PENDING_PAYMENT_ID_KEY = 'jcos.pendingPaymentId';
export const PENDING_IDEMPOTENCY_KEY = 'jcos.pendingIdempotencyKey';
export const PENDING_CHECKOUT_FP_KEY = 'jcos.pendingCheckoutFp';

export type PendingCheckoutOrder = {
  orderId: string;
  orderNumber: string;
  payToken: string;
  idempotencyKey: string;
  fingerprint: string;
};

export function buildCheckoutFingerprint(input: {
  lines: Array<{ variantId: string; qty: number }>;
  email: string;
  phone: string;
  customerName: string;
  customerNote?: string | null;
  shippingMethod: string;
  shippingAddress: {
    city: string;
    address: string;
    apartment?: string;
    region?: string;
    district?: string;
    postalCode?: string;
    comment?: string;
    pvzCode?: string;
    phone?: string;
    recipientName?: string;
  };
  promoCode?: string | null;
  giftCertificateCode?: string | null;
  shippingCost: number;
  /** variantId подарка благодарности из UI (null если порог не достигнут). Меняет fingerprint → не reuse старого заказа без gift. */
  gratitudeGiftVariantId?: string | null;
}): string {
  return JSON.stringify({
    lines: input.lines
      .map((l) => `${l.variantId}:${l.qty}`)
      .sort(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    customerName: input.customerName.trim(),
    customerNote: (input.customerNote ?? '').trim(),
    shippingMethod: input.shippingMethod,
    city: input.shippingAddress.city.trim().toLowerCase(),
    address: input.shippingAddress.address.trim().toLowerCase(),
    apartment: (input.shippingAddress.apartment ?? '').trim(),
    region: (input.shippingAddress.region ?? '').trim(),
    district: (input.shippingAddress.district ?? '').trim(),
    postalCode: (input.shippingAddress.postalCode ?? '').trim(),
    comment: (input.shippingAddress.comment ?? '').trim(),
    pvzCode: (input.shippingAddress.pvzCode ?? '').trim(),
    shippingPhone: (input.shippingAddress.phone ?? '').trim(),
    recipientName: (input.shippingAddress.recipientName ?? '').trim(),
    promo: (input.promoCode ?? '').trim().toUpperCase(),
    gift: (input.giftCertificateCode ?? '').trim().toUpperCase(),
    shippingCost: input.shippingCost,
    gratitudeGiftVariantId: (input.gratitudeGiftVariantId ?? '').trim() || null,
  });
}

export function readPendingCheckoutOrder(): PendingCheckoutOrder | null {
  if (typeof sessionStorage === 'undefined') return null;
  const orderId = sessionStorage.getItem(PENDING_ORDER_ID_KEY) || '';
  const orderNumber = sessionStorage.getItem(PENDING_ORDER_NUMBER_KEY) || '';
  const payToken = sessionStorage.getItem(PENDING_PAY_TOKEN_KEY) || '';
  const idempotencyKey = sessionStorage.getItem(PENDING_IDEMPOTENCY_KEY) || '';
  const fingerprint = sessionStorage.getItem(PENDING_CHECKOUT_FP_KEY) || '';
  if (!orderId || !payToken) return null;
  return { orderId, orderNumber, payToken, idempotencyKey, fingerprint };
}

export function writePendingCheckoutOrder(input: {
  orderId: string;
  orderNumber: string;
  payToken: string;
  idempotencyKey: string;
  fingerprint: string;
  paymentId?: string | null;
}) {
  sessionStorage.setItem(PENDING_ORDER_ID_KEY, input.orderId);
  sessionStorage.setItem(PENDING_ORDER_NUMBER_KEY, input.orderNumber);
  sessionStorage.setItem(PENDING_PAY_TOKEN_KEY, input.payToken);
  sessionStorage.setItem(PENDING_IDEMPOTENCY_KEY, input.idempotencyKey);
  sessionStorage.setItem(PENDING_CHECKOUT_FP_KEY, input.fingerprint);
  if (input.paymentId) {
    sessionStorage.setItem(PENDING_PAYMENT_ID_KEY, input.paymentId);
  }
}

export function clearPendingCheckoutOrder() {
  sessionStorage.removeItem(PENDING_ORDER_ID_KEY);
  sessionStorage.removeItem(PENDING_ORDER_NUMBER_KEY);
  sessionStorage.removeItem(PENDING_PAY_TOKEN_KEY);
  sessionStorage.removeItem(PENDING_PAYMENT_ID_KEY);
  sessionStorage.removeItem(PENDING_IDEMPOTENCY_KEY);
  sessionStorage.removeItem(PENDING_CHECKOUT_FP_KEY);
}

/** Success return URL: orderId (+ number) only — payToken остаётся в sessionStorage
 *  этой вкладки. Другая вкладка/устройство без session не подтвердит оплату
 *  (осознанно; guest cross-device потребовал бы payToken в query — security tradeoff).
 */
export function buildOrderSuccessReturnUrl(opts?: {
  orderId?: string | null;
  orderNumber?: string | null;
}): string {
  const orderId =
    opts?.orderId ??
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(PENDING_ORDER_ID_KEY)
      : null) ??
    '';
  const number =
    opts?.orderNumber ??
    (typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(PENDING_ORDER_NUMBER_KEY)
      : null) ??
    '';
  const qs = new URLSearchParams();
  if (orderId) qs.set('orderId', orderId);
  if (number) qs.set('number', number);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/order/success?${qs.toString()}`;
}
