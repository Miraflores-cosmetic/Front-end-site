import type { CheckoutLine, VoucherKind } from '@/types/checkout';
import { isGiftDenomOnlyCart, lineIsGiftDenom } from '@/utils/giftDenomCart';

export type PayableTotalsInput = {
  lines: CheckoutLine[];
  voucherDiscount?: number | null;
  /** gift покрывает товары+доставку; promo — только товары. */
  voucherKind?: VoucherKind | null;
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
  /** Товары после промо/сертификата (для gift — до вычета части на доставку). */
  goodsTotal: number;
  hasPayableLines: boolean;
  shippingRub: number | null;
  /** Можно включать доставку в итог (есть тариф или только подарки). */
  shippingReady: boolean;
  /**
   * К оплате.
   * gift: max(0, goods + shipping − voucher).
   * promo/нет: max(0, goods − voucher) + shipping.
   * null, если есть платные товары, а доставка ещё не готова.
   */
  payableTotal: number | null;
};

/**
 * Один источник правды для CTA / summary / clientEstimate до create.
 * После createOrder charge = Nest order.total (может чуть отличаться после sync /
 * server shipping reprice) — UI сверяет и показывает server total.
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
  const isGiftVoucher = input.voucherKind === 'gift';
  const giftDenomOnly = isGiftDenomOnlyCart(lines);
  /** Платные physical-позиции (нужна доставка). gift-denom — digital. */
  const hasPayableLines = lines.some((l) => !l.isGift && !lineIsGiftDenom(l));

  const shippingRub = giftDenomOnly
    ? 0
    : input.shippingRub != null && Number.isFinite(input.shippingRub)
      ? Math.max(0, Math.floor(input.shippingRub))
      : null;

  const shippingReady =
    giftDenomOnly ||
    !hasPayableLines ||
    (Boolean(!input.shippingLoading) &&
      shippingRub != null &&
      !input.shippingError);

  // Для отображения строки «товары»: gift сначала гасит товары, остаток — доставку.
  const goodsTotal = isGiftVoucher
    ? Math.max(0, goodsSubtotal - Math.min(voucherDiscount, goodsSubtotal))
    : Math.max(0, goodsSubtotal - voucherDiscount);

  let payableTotal: number | null = null;
  if (shippingReady) {
    const ship = shippingRub ?? 0;
    payableTotal = isGiftVoucher
      ? Math.max(0, goodsSubtotal + ship - voucherDiscount)
      : goodsTotal + ship;
  }

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
