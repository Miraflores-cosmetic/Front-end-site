import type { CheckoutLine } from '@/types/checkout';

export type PayableTotalsInput = {
  lines: CheckoutLine[];
  voucherDiscount?: number | null;
  /** Эффективная доставка ₽; null — расчёт ещё не готов / ошибка. */
  shippingRub: number | null;
  shippingLoading?: boolean;
  shippingError?: string | null;
};

export type PayableTotals = {
  totalItems: number;
  /** Сумма товаров (вкл. gift=0 по цене, но qty в items). */
  goodsSubtotal: number;
  totalOldPrice: number;
  catalogDiscount: number;
  voucherDiscount: number;
  /** Товары после промо: max(0, goodsSubtotal − voucher). */
  goodsTotal: number;
  hasPayableLines: boolean;
  shippingRub: number | null;
  /** Можно включать доставку в итог (есть тариф или только подарки). */
  shippingReady: boolean;
  /**
   * К оплате = goodsTotal + shipping.
   * null, если есть платные товары, а доставка ещё не готова — не показываем «без shipping».
   */
  payableTotal: number | null;
};

/**
 * Один источник правды для CTA / summary / clientEstimate до create.
 * После createOrder charge = Nest order.total (может чуть отличаться после sync /
 * server shipping reprice) — UI сверяет и показывает server total.
 * payableTotal = goods + shipping — как Nest order.total в happy path.
 */
export function calcPayableTotals(input: PayableTotalsInput): PayableTotals {
  const lines = input.lines ?? [];
  let totalItems = 0;
  let goodsSubtotal = 0;
  let totalOldPrice = 0;

  for (const line of lines) {
    const q = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const price = Number(line.price) || 0;
    const old = Number(line.oldPrice) || 0;
    totalItems += q;
    if (!line.isGift) {
      goodsSubtotal += price * q;
      totalOldPrice += (old > price ? old : price) * q;
    } else {
      totalOldPrice += (old > price ? old : price) * q;
    }
  }

  const catalogDiscount = Math.max(0, totalOldPrice - goodsSubtotal);
  const voucherDiscount = Math.max(0, Math.floor(input.voucherDiscount || 0));
  const goodsTotal = Math.max(0, goodsSubtotal - voucherDiscount);
  const hasPayableLines = lines.some((l) => !l.isGift);

  const shippingRub =
    input.shippingRub != null && Number.isFinite(input.shippingRub)
      ? Math.max(0, Math.floor(input.shippingRub))
      : null;

  const shippingReady =
    !hasPayableLines ||
    (Boolean(!input.shippingLoading) &&
      shippingRub != null &&
      !input.shippingError);

  const payableTotal = shippingReady
    ? goodsTotal + (shippingRub ?? 0)
    : null;

  return {
    totalItems,
    goodsSubtotal,
    totalOldPrice,
    catalogDiscount,
    voucherDiscount,
    goodsTotal,
    hasPayableLines,
    shippingRub,
    shippingReady,
    payableTotal,
  };
}
