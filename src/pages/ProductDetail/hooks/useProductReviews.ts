import { useEffect, useState } from 'react';
import { getProductReviewsMeta } from '@/graphql/queries/reviewsAll.service';

export type UseProductReviewsResult = {
  ratingAvg: number;
  ratingCount: number;
  loading: boolean;
};

/** Рейтинг товара — shared cache с /reviews?product=… */
export function useProductReviews(slug: string | undefined): UseProductReviewsResult {
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(slug));

  useEffect(() => {
    const s = slug?.trim();
    if (!s) {
      setRatingAvg(0);
      setRatingCount(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getProductReviewsMeta(s)
      .then((res) => {
        if (cancelled) return;
        const count = res.ratingCount ?? 0;
        const avg =
          typeof res.ratingAvg === 'number' && Number.isFinite(res.ratingAvg)
            ? res.ratingAvg
            : 0;
        setRatingCount(count);
        setRatingAvg(Math.min(5, Math.max(0, Math.round(avg * 10) / 10)));
      })
      .catch(() => {
        if (!cancelled) {
          setRatingAvg(0);
          setRatingCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { ratingAvg, ratingCount, loading };
}
