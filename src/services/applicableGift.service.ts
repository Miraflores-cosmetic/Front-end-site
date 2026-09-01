import { getApplicableGift as fetchApplicableGift } from '@/api/settingsApi';

export interface ApplicableGiftResult {
  applicable: boolean;
  variantId?: string;
  productName?: string;
  thumbnailUrl?: string;
  quantity?: number;
}

export async function getApplicableGift(
  subtotal: number,
  _channel?: string,
): Promise<ApplicableGiftResult> {
  if (subtotal <= 0) return { applicable: false };
  try {
    const res = await fetchApplicableGift(subtotal);
    return {
      ...res,
      thumbnailUrl: res.thumbnailUrl ?? undefined,
    };
  } catch {
    return { applicable: false };
  }
}
