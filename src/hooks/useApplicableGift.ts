import { useEffect, useState } from 'react';
import { getApplicableGift } from '@/services/applicableGift.service';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export type ApplicableGiftLine = {
  variantId: string;
  title: string;
  thumbnail: string;
  quantity: number;
  price: number;
  isGift: true;
};

/**
 * Подарки благодарности по порогу с бэка (без клиентского хардкода minRub).
 * `goodsAfterPromo` — сумма товаров после промокода (как Nest create).
 */
export function useApplicableGift(goodsAfterPromo: number): ApplicableGiftLine[] {
  const [gifts, setGifts] = useState<ApplicableGiftLine[]>([]);

  useEffect(() => {
    if (goodsAfterPromo <= 0) {
      setGifts([]);
      return;
    }

    let cancelled = false;
    getApplicableGift(goodsAfterPromo)
      .then((res) => {
        if (cancelled) return;
        const rawItems =
          res.applicable && res.items && res.items.length > 0
            ? res.items
            : res.applicable && res.variantId && res.productName
              ? [
                  {
                    variantId: res.variantId,
                    productName: res.productName,
                    variantName: undefined as string | undefined,
                    thumbnailUrl: res.thumbnailUrl,
                    quantity: res.quantity ?? 1,
                  },
                ]
              : [];

        setGifts(
          rawItems
            .filter((it) => it.variantId && it.productName)
            .map((it) => ({
              variantId: it.variantId!,
              title: it.variantName
                ? `${it.productName} — ${it.variantName}`
                : it.productName!,
              thumbnail: normalizeMediaUrl(it.thumbnailUrl || ''),
              quantity: it.quantity ?? 1,
              price: 0,
              isGift: true as const,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) setGifts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [goodsAfterPromo]);

  return gifts;
}
