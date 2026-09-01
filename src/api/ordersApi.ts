import { apiJson, getOrCreateGuestId } from '@/api/apiClient';

export type CreateOrderLine = {
  variantId: string;
  shadeId?: string | null;
  qty: number;
};

export type ShippingCarrierQuoteInput = {
  tariffId?: number | null;
  tariffName?: string | null;
  daysMin?: number | null;
  daysMax?: number | null;
  cost?: number | null;
  method?: string | null;
  freePvz?: boolean;
  source?: string | null;
};

export type ShippingAddressInput = {
  city: string;
  address: string;
  apartment?: string;
  region?: string;
  district?: string;
  postalCode?: string;
  comment?: string;
  /** Код ПВЗ СДЭК (или id пункта Яндекс) — для фулфилмента */
  pvzCode?: string;
  /** Телефон получателя из адреса (отдельно от phone заказа) */
  phone?: string;
  /** ФИО получателя из адреса */
  recipientName?: string;
  carrierQuote?: ShippingCarrierQuoteInput;
};

export type ShippingQuoteInput = {
  lines: CreateOrderLine[];
  shippingAddress: ShippingAddressInput;
  shippingMethod: 'CDEK' | 'YANDEX';
  /** Оценка СДЭК/Яндекс с клиента; Nest подпишет (или 0 при free PVZ). */
  clientEstimate: number;
  carrierQuote?: ShippingCarrierQuoteInput;
};

export type ShippingQuoteResult = {
  cost: number;
  method: 'CDEK' | 'YANDEX';
  freePvz: boolean;
  quote: string;
  expiresAt: string;
  subtotal: number;
  removedKeys?: string[];
};

export type CreateOrderInput = {
  lines: CreateOrderLine[];
  email: string;
  phone: string;
  customerName: string;
  /** Комментарий покупателя к заказу */
  customerNote?: string | null;
  guestId?: string;
  promoCode?: string | null;
  giftCertificateCode?: string | null;
  idempotencyKey: string;
  shippingAddress: ShippingAddressInput;
  shippingMethod: 'CDEK' | 'YANDEX';
  /** HMAC quote из requestShippingQuote */
  shippingQuote: string;
};

export type CreatedOrder = {
  id: string;
  number: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: string | null;
  status: string;
  payToken?: string | null;
  items?: Array<{
    variantId?: string | null;
    unitPrice?: number;
    isGratitudeGift?: boolean;
    title?: string;
  }>;
};

export type PayOrderResponse = {
  alreadyPaid?: boolean;
  orderId: string;
  number: string;
  total: number;
  paymentId?: string;
  confirmationToken?: string;
  message?: string | string[];
};

export type CheckoutStatusResponse = {
  number?: string;
  orderId?: string;
  paid?: boolean;
  message?: string;
};

export async function requestShippingQuote(
  input: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
  return apiJson('/orders/shipping-quote', 'POST', input);
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  return apiJson('/orders', 'POST', {
    ...input,
    guestId: input.guestId ?? getOrCreateGuestId(),
  });
}

export async function payOrder(orderId: string, payToken: string): Promise<PayOrderResponse> {
  return apiJson(`/orders/${encodeURIComponent(orderId)}/pay`, 'POST', { payToken });
}

export async function abandonOrder(orderId: string, payToken: string): Promise<void> {
  await apiJson(`/orders/${encodeURIComponent(orderId)}/abandon`, 'POST', { payToken });
}

export async function getCheckoutStatus(
  orderId: string,
  payToken?: string | null,
): Promise<CheckoutStatusResponse> {
  const { apiFetch } = await import('@/api/apiClient');
  return apiFetch(`/orders/${encodeURIComponent(orderId)}/checkout-status`, {
    query: payToken ? { payToken } : undefined,
  });
}

export async function getPaymentStatus(
  paymentId: string,
  payToken: string,
): Promise<{ paid?: boolean; status?: string }> {
  const { apiFetch } = await import('@/api/apiClient');
  return apiFetch(`/orders/payments/${encodeURIComponent(paymentId)}/status`, {
    query: { payToken },
  });
}
