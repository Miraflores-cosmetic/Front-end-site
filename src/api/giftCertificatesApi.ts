import { apiFetch, apiJson, getOrCreateGuestId, uploadsUrl } from '@/api/apiClient';

export type GiftDenomination = {
  id: string;
  name: string;
  faceValue: number;
  validityDays: number | null;
  sortOrder: number;
  images: Array<{
    id: string;
    url: string;
    mediaType?: string | null;
    sortOrder: number;
  }>;
};

export type GiftPurchaseResult = {
  id: string;
  number: string;
  total: number;
  payToken?: string | null;
  giftPurchaseRecipientEmail?: string | null;
};

export type PurchaseGiftCertificateInput = {
  denominationId: string;
  qty: number;
  email: string;
  phone: string;
  customerName: string;
  recipientEmail?: string | null;
  idempotencyKey: string;
  guestId?: string;
};

export async function fetchGiftDenominations(): Promise<GiftDenomination[]> {
  const rows = await apiFetch<GiftDenomination[]>('/gift-certificates/denominations');
  return (Array.isArray(rows) ? rows : []).map((d) => ({
    ...d,
    images: (d.images ?? []).map((img) => ({
      ...img,
      url: uploadsUrl(img.url) || img.url,
    })),
  }));
}

export async function purchaseGiftCertificate(
  input: PurchaseGiftCertificateInput,
): Promise<GiftPurchaseResult> {
  return apiJson('/gift-certificates/purchase', 'POST', {
    ...input,
    guestId: input.guestId ?? getOrCreateGuestId(),
  });
}
