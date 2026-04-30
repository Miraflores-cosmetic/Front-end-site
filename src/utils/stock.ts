/** Нет доступного количества на складе (учёт включён). */
export function isVariantOutOfStock(params: {
  trackInventory?: boolean | null;
  quantityAvailable?: number | null;
}): boolean {
  if (params.trackInventory === false) return false;
  const q = params.quantityAvailable;
  if (q === null || q === undefined) return false;
  return q <= 0;
}
