import type { BestSellersProduct } from '@/types/products';
import type { CatalogPageData } from './catalogLoad';

export type CatalogPlpMeta = Omit<CatalogPageData, 'products' | 'page'>;

export type CatalogPlpSnapshot = {
  filterKey: string;
  meta: CatalogPlpMeta;
  products: BestSellersProduct[];
  page: number;
  scrollY: number;
  highlightProductId: string | null;
  at: number;
};

const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 10;

const cache = new Map<string, CatalogPlpSnapshot>();

function prune() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (now - v.at > TTL_MS) cache.delete(k);
  }
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest == null) break;
    cache.delete(oldest);
  }
}

export function saveCatalogPlp(snap: CatalogPlpSnapshot): void {
  if (!snap.filterKey || !snap.meta || snap.products.length === 0) return;
  prune();
  // Map preserves insertion order — delete+set = newest at end for LRU-ish prune.
  cache.delete(snap.filterKey);
  cache.set(snap.filterKey, { ...snap, at: Date.now() });
}

export function peekCatalogPlp(filterKey: string): CatalogPlpSnapshot | null {
  prune();
  const hit = cache.get(filterKey);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(filterKey);
    return null;
  }
  return hit;
}

/** Читает и оставляет в кэше (повторный Back / повторный заход). */
export function readCatalogPlp(filterKey: string): CatalogPlpSnapshot | null {
  return peekCatalogPlp(filterKey);
}

export function clearCatalogPlp(filterKey?: string): void {
  if (filterKey) cache.delete(filterKey);
  else cache.clear();
}
