import type { CheckoutShippingMethod } from '@/utils/checkoutShipping';

export type DeliverySurchargeCarrier = 'cdek' | 'ozon' | 'yandex';

export type DeliverySurcharges = {
  cdekSurchargeRub: number;
  ozonSurchargeRub: number;
  yandexSurchargeRub: number;
};

export const DELIVERY_SURCHARGE_DEFAULTS: DeliverySurcharges = {
  cdekSurchargeRub: 0,
  ozonSurchargeRub: 0,
  yandexSurchargeRub: 0,
};

export function normalizeDeliverySurcharges(
  data: Partial<DeliverySurcharges> | null | undefined,
): DeliverySurcharges {
  const clamp = (n: unknown) => {
    const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 0;
    return Math.max(0, Math.min(500_000, v));
  };
  return {
    cdekSurchargeRub: clamp(data?.cdekSurchargeRub),
    ozonSurchargeRub: clamp(data?.ozonSurchargeRub),
    yandexSurchargeRub: clamp(data?.yandexSurchargeRub),
  };
}

export function checkoutMethodToSurchargeCarrier(
  method: CheckoutShippingMethod,
): DeliverySurchargeCarrier {
  if (method === 'CDEK') return 'cdek';
  if (method === 'OZON') return 'ozon';
  return 'yandex';
}

export function surchargeRubForCarrier(
  carrier: DeliverySurchargeCarrier,
  surcharges: DeliverySurcharges,
): number {
  if (carrier === 'cdek') return surcharges.cdekSurchargeRub;
  if (carrier === 'ozon') return surcharges.ozonSurchargeRub;
  return surcharges.yandexSurchargeRub;
}

/** Тариф перевозчика + добавочная стоимость (для отображения на checkout). */
export function withDeliverySurcharge(
  baseRub: number | null,
  method: CheckoutShippingMethod | null | undefined,
  surcharges: DeliverySurcharges,
): number | null {
  if (baseRub == null || !method) return baseRub;
  const base = Math.floor(baseRub);
  if (!Number.isFinite(base) || base < 1) return null;
  return base + surchargeRubForCarrier(checkoutMethodToSurchargeCarrier(method), surcharges);
}

/** База без добавки — для clientEstimate в shipping-quote. */
export function clientEstimateBaseRub(
  displayedRub: number,
  method: CheckoutShippingMethod,
  surcharges: DeliverySurcharges,
): number {
  return Math.max(
    0,
    Math.floor(displayedRub) -
      surchargeRubForCarrier(checkoutMethodToSurchargeCarrier(method), surcharges),
  );
}
