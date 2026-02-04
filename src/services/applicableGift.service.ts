/**
 * Сервис для получения подарка по программе благодарности при текущей сумме корзины.
 * Миниатюра подарка запрашивается через GraphQL (корректный URL с base64 ID), т.к. REST API может отдавать числовой id.
 */

import { graphqlRequest } from '@/graphql/client';

export interface ApplicableGiftResult {
  applicable: boolean;
  variantId?: string;
  productName?: string;
  thumbnailUrl?: string;
  quantity?: number;
}

async function getThumbnailUrlByVariantId(
  variantId: string,
  channel: string
): Promise<string | undefined> {
  try {
    const query = `
      query GiftProductThumbnail($ids: [ID!]!, $channel: String!) {
        productVariants(first: 1, channel: $channel, ids: $ids) {
          edges {
            node {
              product {
                thumbnail(size: 256) { url }
              }
            }
          }
        }
      }
    `;
    const result = await graphqlRequest<{
      productVariants?: { edges?: Array<{ node?: { product?: { thumbnail?: { url?: string } } } }> };
    }>(query, { ids: [variantId], channel });
    const url = result?.productVariants?.edges?.[0]?.node?.product?.thumbnail?.url;
    return url || undefined;
  } catch {
    return undefined;
  }
}

export async function getApplicableGift(
  subtotal: number,
  channel: string = 'miraflores-site'
): Promise<ApplicableGiftResult> {
  if (subtotal <= 0) {
    return { applicable: false };
  }
  const subtotalInt = Math.round(subtotal);
  const url = `/api/checkout/applicable-gift/?channel=${encodeURIComponent(channel)}&subtotal=${subtotalInt}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    let data: ApplicableGiftResult;
    try {
      data = await res.json();
    } catch {
      return { applicable: false };
    }
    if (!res.ok || !data || typeof data.applicable !== 'boolean') return { applicable: false };
    if (data.applicable && data.variantId) {
      const graphqlThumb = await getThumbnailUrlByVariantId(data.variantId, channel);
      if (graphqlThumb) data.thumbnailUrl = graphqlThumb;
    }
    return data;
  } catch {
    return { applicable: false };
  }
}
