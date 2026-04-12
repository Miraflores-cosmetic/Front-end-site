/**
 * Максимальное количество единиц варианта в корзине для витрины.
 * `quantityLimitPerCustomer` с варианта; если null — только серверный глобальный лимит (клиент не знает без staff API).
 */
export function maxQuantityForVariantLine(quantityLimitPerCustomer: number | null | undefined): number {
  if (quantityLimitPerCustomer != null && quantityLimitPerCustomer > 0) {
    return quantityLimitPerCustomer;
  }
  const raw = import.meta.env.VITE_MAX_LINE_QUANTITY;
  if (raw != null && String(raw).trim() !== '') {
    const n = parseInt(String(raw), 10);
    if (!Number.isNaN(n) && n > 0) {
      return n;
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

export function isAtOrOverLineLimit(
  quantity: number,
  quantityLimitPerCustomer: number | null | undefined
): boolean {
  return quantity >= maxQuantityForVariantLine(quantityLimitPerCustomer);
}
