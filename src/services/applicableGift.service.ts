import { getApplicableGift as fetchApplicableGift } from '@/api/settingsApi';

export interface ApplicableGiftItem {
  variantId?: string;
  productName?: string;
  variantName?: string;
  thumbnailUrl?: string | null;
  quantity?: number;
}

export interface ApplicableGiftResult {
  applicable: boolean;
  items?: ApplicableGiftItem[];
  /** @deprecated single-gift compat */
  variantId?: string;
  productName?: string;
  thumbnailUrl?: string;
  quantity?: number;
}

export async function getApplicableGift(
  subtotal: number,
  _channel?: string,
): Promise<ApplicableGiftResult> {
  if (subtotal <= 0) return { applicable: false, items: [] };
  try {
    const res = await fetchApplicableGift(subtotal);
    return {
      ...res,
      thumbnailUrl: res.thumbnailUrl ?? undefined,
      items: (res.items ?? []).map((it) => ({
        ...it,
        thumbnailUrl: it.thumbnailUrl ?? undefined,
      })),
    };
  } catch {
    return { applicable: false, items: [] };
  }
}
