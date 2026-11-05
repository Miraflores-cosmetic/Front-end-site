import { useEffect, useState } from 'react';
import {
  fetchSamplePurchaseRules,
  type SamplePurchaseRules,
} from '@/api/catalogApi';

const CACHE_TTL_MS = 60_000;

let cache: { data: SamplePurchaseRules; fetchedAt: number } | null = null;
let inflight: Promise<SamplePurchaseRules> | null = null;

function cacheFresh(): boolean {
  return (
    cache != null && Date.now() - cache.fetchedAt < CACHE_TTL_MS
  );
}

function loadSamplePurchaseRules(): Promise<SamplePurchaseRules> {
  if (inflight) return inflight;
  inflight = fetchSamplePurchaseRules()
    .then((data) => {
      cache = { data, fetchedAt: Date.now() };
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

/** Сброс in-flight (тесты / принудительный retry). */
/** Прогрев из hero PDP (без CLS на notice). */
export function seedSamplePurchaseRulesCache(data: SamplePurchaseRules): void {
  cache = { data, fetchedAt: Date.now() };
  inflight = null;
}

export function resetSamplePurchaseRulesCache(): void {
  cache = null;
  inflight = null;
}

export function useSamplePurchaseRules(): SamplePurchaseRules | null {
  const [rules, setRules] = useState<SamplePurchaseRules | null>(
    cacheFresh() ? cache!.data : null,
  );

  useEffect(() => {
    if (cacheFresh()) {
      setRules(cache!.data);
      return;
    }

    let cancelled = false;
    void loadSamplePurchaseRules()
      .then((data) => {
        if (!cancelled) setRules(data);
      })
      .catch(() => {
        if (!cancelled) setRules(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return rules;
}
