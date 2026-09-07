import { apiJson, getOrCreateGuestId } from '@/api/apiClient';

export type VoucherKind = 'promo' | 'gift';

export interface VoucherValidationResult {
  ok: boolean;
  kind?: VoucherKind;
  code?: string;
  discountAmount?: number;
  discountType?: 'FIXED' | 'PERCENTAGE' | 'PERCENT' | 'FIXED' | 'GIFT';
  discountPercent?: number;
  discountName?: string;
  error?: string;
};

/**
 * Сначала подарочный сертификат, затем промокод (как в Jcos cart).
 * Сертификат: payable = товары + доставка (если известна).
 * Промокод: только товары.
 */
export async function validateVoucher(
  promoCode: string,
  _variantIds: string[],
  _quantities: number[],
  _channel?: string,
  subtotal?: number,
  email?: string,
  shippingRub?: number | null,
): Promise<VoucherValidationResult> {
  const code = promoCode.trim();
  const goods = Math.max(0, Math.round(subtotal ?? 0));
  const ship = Math.max(0, Math.round(shippingRub ?? 0));
  const giftPayable = goods + ship;

  try {
    const giftRes = await apiJson<{
      kind?: string;
      code: string;
      applyAmount: number;
    }>('/gift-certificates/validate', 'POST', {
      code,
      payableBeforeGift: giftPayable,
    });

    if (giftRes.kind === 'gift' && giftRes.applyAmount >= 1) {
      return {
        ok: true,
        kind: 'gift',
        code: giftRes.code || code.toUpperCase(),
        discountAmount: giftRes.applyAmount,
        discountType: 'GIFT',
        discountName: giftRes.code || code,
      };
    }
  } catch {
    // не сертификат — пробуем промокод
  }

  try {
    const res = await apiJson<{
      code: string;
      type: string;
      value: number;
      discountAmount: number;
      total: number;
    }>('/promo/validate', 'POST', {
      code,
      subtotal: goods,
      email,
      guestId: getOrCreateGuestId(),
    });

    const discountType =
      res.type === 'PERCENT' ? 'PERCENTAGE' : res.type === 'FIXED' ? 'FIXED' : res.type;

    return {
      ok: true,
      kind: 'promo',
      code: res.code,
      discountAmount: res.discountAmount,
      discountType: discountType as VoucherValidationResult['discountType'],
      discountPercent: res.type === 'PERCENT' ? res.value : undefined,
      discountName: res.code,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Ошибка при валидации промокода';
    return { ok: false, error: msg };
  }
}
