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
 */
export function useApplicableGift(subtotal: number): ApplicableGiftLine | null {
  const [gift, setGift] = useState<ApplicableGiftLine | null>(null);

  useEffect(() => {
    if (subtotal <= 0) {
      setGift(null);
      return;
    }

    let cancelled = false;
    getApplicableGift(subtotal)
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
  }, [subtotal]);

  return gift;
}
