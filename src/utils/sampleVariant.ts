/**
 * Синхронно с backend `sample-variant.util.ts`.
 * Источник истины на API: `variant.isSample`; имя — legacy fallback.
 */

const SAMPLE_NAME_TOKEN =
  /(?:^|[^a-zа-яё0-9])пробник(?:$|[^a-zа-яё0-9])/i;

export function isSampleVariantName(name: string | null | undefined): boolean {
  const raw = (name ?? '').trim();
  if (!raw) return false;
  const n = raw.toLowerCase();
  if (n === 'пробник') return true;
  return SAMPLE_NAME_TOKEN.test(raw);
}

export type SampleVariantLike = {
  isSample?: boolean | null;
  name?: string | null;
};

export function isProductVariantSample(
  v: SampleVariantLike | null | undefined,
): boolean {
  if (!v) return false;
  if (v.isSample === true) return true;
  if (v.isSample === false) return false;
  return isSampleVariantName(v.name);
}
