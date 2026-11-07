/**
 * Зеркало backend ReferralWalletService.computeSpendAmount:
 * min(available, floor(payable × cap%), payable).
 */
export function computeReferralSpendAmount(opts: {
  available: number;
  payableRub: number;
  spendCapPercent: number;
  enabled?: boolean;
}): number {
  if (opts.enabled === false) return 0;
  const payable = Math.max(0, Math.floor(opts.payableRub));
  const available = Math.max(0, Math.floor(opts.available));
  const capPct = Math.min(100, Math.max(0, Math.floor(opts.spendCapPercent)));
  if (payable < 1 || available < 1 || capPct < 1) return 0;
  const capped = Math.floor((payable * capPct) / 100);
  return Math.min(available, capped, payable);
}
