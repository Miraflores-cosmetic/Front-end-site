import { apiJson, getOrCreateGuestId } from '@/api/apiClient';
import { getMirafloresReferral } from '@/lib/mirafloresReferral';
import { getYourichAffiliate } from '@/lib/yourichAffiliate';
import type { CheckoutShippingMethod } from '@/utils/checkoutShipping';

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
  /** Код ПВЗ СДЭК (или id пункта Яндекс / Ozon) — для фулфилмента */
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
  shippingMethod: CheckoutShippingMethod;
  /** Оценка с клиента; Nest подпишет (Ozon/СДЭК пересчитывает сам, 0 при free PVZ). */
  clientEstimate: number;
  carrierQuote?: ShippingCarrierQuoteInput;
  /** Для порога бесплатной доставки до ПВЗ (скидка вычитается на сервере). */
  promoCode?: string | null;
  guestId?: string;
  email?: string;
  phone?: string;
};

export type ShippingQuoteResult = {
  cost: number;
  method: CheckoutShippingMethod;
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
  /** XOR с promo/gift; только JWT buyer. */
  useReferralWallet?: boolean;
  idempotencyKey: string;
  shippingAddress: ShippingAddressInput;
  /** Не нужен для digital gift-denom-only. */
  shippingMethod?: CheckoutShippingMethod | null;
  /** HMAC quote из requestShippingQuote; не нужен для gift-denom-only. */
  shippingQuote?: string | null;
  /** Клиент не нашёл адрес — без quote / без оплаты на витрине. */
  needsAddressClarification?: boolean;
  /** YouRich attribution (?yr= / cookies); обычно подставляется в createOrder. */
  affiliate?: {
    refHash?: string | null;
    extUserId?: string | null;
  } | null;
  /** Miraflores referral (?mf=CODE); обычно подставляется в createOrder. */
  referral?: {
    code?: string | null;
  } | null;
};

export type CreatedOrder = {
  id: string;
  number: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  promoCode: string | null;
  status: string;
  /** 0 ₽: Nest переводит в PAID без виджета ЮKassa */
  alreadyPaid?: boolean;
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
  /** HMAC для OrderSuccess / paymentStatus (если pay шёл по JWT buyer). */
  payToken?: string | null;
  message?: string | string[];
};

export type CheckoutStatusResponse = {
  number?: string;
  orderId?: string;
  paid?: boolean;
  orderStatus?: string;
  total?: number;
  message?: string;
  latePayment?: boolean;
};

export type OzonShippingEstimate = {
  cost: number | null;
  daysMin: number | null;
  daysMax: number | null;
};

export async function requestOzonShippingEstimate(input: {
  lines: Array<{ variantId: string; qty: number }>;
  dropoff: 'pvz' | 'courier';
}): Promise<OzonShippingEstimate> {
  return apiJson('/orders/shipping-estimate/ozon', 'POST', input);
}

export async function requestShippingQuote(
  input: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
  return apiJson('/orders/shipping-quote', 'POST', input);
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const affiliate =
    input.affiliate !== undefined ? input.affiliate : getYourichAffiliate();
  const referral =
    input.referral !== undefined ? input.referral : getMirafloresReferral();
  return apiJson('/orders', 'POST', {
    ...input,
    guestId: input.guestId ?? getOrCreateGuestId(),
    ...(affiliate?.refHash || affiliate?.extUserId
      ? {
          affiliate: {
            ...(affiliate.refHash ? { refHash: affiliate.refHash } : {}),
            ...(affiliate.extUserId ? { extUserId: affiliate.extUserId } : {}),
          },
        }
      : {}),
    ...(referral?.code
      ? {
          referral: { code: referral.code },
        }
      : {}),
  });
}

export async function payOrder(
  orderId: string,
  payToken?: string | null,
): Promise<PayOrderResponse> {
  return apiJson(
    `/orders/${encodeURIComponent(orderId)}/pay`,
    'POST',
    payToken ? { payToken } : {},
  );
}

export type YandexPayConfig = {
  enabled: boolean;
  merchantId?: string;
  env?: 'SANDBOX' | 'PRODUCTION';
};

export type YandexPayOrderResponse = {
  alreadyPaid?: boolean;
  orderId: string;
  number: string;
  total: number;
  paymentId?: string;
  paymentUrl?: string;
  payToken?: string | null;
  message?: string | string[];
};

export async function fetchYandexPayConfig(): Promise<YandexPayConfig> {
  try {
    return await apiJson('/orders/yandexpay/config', 'GET');
  } catch {
    return { enabled: false };
  }
}

/** Merchant API create → paymentUrl для YaPay.onPayButtonClick. */
export async function createYandexPayPayment(
  orderId: string,
  payToken?: string | null,
): Promise<YandexPayOrderResponse> {
  return apiJson(
    `/orders/${encodeURIComponent(orderId)}/pay/yandexpay`,
    'POST',
    payToken ? { payToken } : {},
  );
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
