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
 * Подарок благодарности по порогу с бэка (без клиентского хардкода minRub).
 * `goodsAfterPromo` — сумма товаров после промокода (как Nest create).
 */
export function useApplicableGift(goodsAfterPromo: number): ApplicableGiftLine | null {
  const [gift, setGift] = useState<ApplicableGiftLine | null>(null);

  useEffect(() => {
    if (goodsAfterPromo <= 0) {
      setGift(null);
      return;
    }

    let cancelled = false;
    getApplicableGift(goodsAfterPromo)
      .then((res) => {
        if (cancelled) return;
        if (res.applicable && res.variantId && res.productName) {
          setGift({
            variantId: res.variantId,
            title: res.productName,
            thumbnail: normalizeMediaUrl(res.thumbnailUrl || ''),
            quantity: res.quantity ?? 1,
            price: 0,
            isGift: true,
          });
        } else {
          setGift(null);
        }
      })
      .catch(() => {
        if (!cancelled) setGift(null);
      });

    return () => {
      cancelled = true;
    };
  }, [goodsAfterPromo]);

  return gift;
}
