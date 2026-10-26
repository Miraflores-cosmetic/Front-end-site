import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCatalogTags } from '@/store/slices/navSlice';
import type { NavCatalogTag } from '@/types/nav';
import type { AppDispatch, RootState } from '@/store/store';
import type { BestSellerEtap } from '@/components/bestseller-card/bestseller-etaps/BestsellerEtaps';

export const CARE_STAGE_SLUGS = [
  'care-stage-ochishchenie-etap-1',
  'care-stage-tonizatsiia-etap-2',
  'care-stage-sos-ukhod-etap-30',
  'care-stage-pitanie-i-uvlazhnenie-etap-31',
] as const;

const CARE_STAGE_FALLBACK: BestSellerEtap[] = [
  { id: 1, title: 'Этап 1', name: 'Очищение', slug: CARE_STAGE_SLUGS[0] },
  { id: 2, title: 'Этап 2', name: 'Тонизация', slug: CARE_STAGE_SLUGS[1] },
  { id: 3, title: 'Этап 3.0', name: 'SOS - уход', slug: CARE_STAGE_SLUGS[2] },
  { id: 4, title: 'Этап 3.1', name: 'Питание и увлажнение', slug: CARE_STAGE_SLUGS[3] },
];

function isCareStageTag(slug: string): boolean {
  return CARE_STAGE_SLUGS.includes(slug as (typeof CARE_STAGE_SLUGS)[number]);
}

function etapTitleForIndex(index: number): string {
  if (index === 2) return 'Этап 3.0';
  if (index === 3) return 'Этап 3.1';
  return `Этап ${index + 1}`;
}

export function nextCareStageSlug(current: string | null, ordered: string[]): string {
  if (!ordered.length) return CARE_STAGE_SLUGS[1];
  if (!current) return ordered[1] ?? ordered[0];
  const idx = ordered.indexOf(current);
  if (idx < 0) return ordered[1] ?? ordered[0];
  return ordered[Math.min(idx + 1, ordered.length - 1)];
}

/** Care-stage labels from Redux nav.tags (shared with Header / Steps). */
export function useCareStageTabs(productTagSlugs: string[] | undefined) {
  const dispatch = useDispatch<AppDispatch>();
  const navTags = useSelector((state: RootState) => state.nav.tags);
  const tagsLoading = useSelector((state: RootState) => state.nav.tagsLoading);

  useEffect(() => {
    if (navTags.length === 0 && !tagsLoading) {
      void dispatch(getCatalogTags());
    }
  }, [dispatch, navTags.length, tagsLoading]);

  const careTags = useMemo((): NavCatalogTag[] => {
    if (!navTags.length) return [];
    const bySlug = new Map(navTags.map((t) => [t.slug, t]));
    const ordered = CARE_STAGE_SLUGS.map((s) => bySlug.get(s)).filter(
      (t): t is NavCatalogTag => t != null,
    );
    if (ordered.length) return ordered;
    return navTags.filter((t) => isCareStageTag(t.slug));
  }, [navTags]);

  const availableEtaps: BestSellerEtap[] = useMemo(() => {
    if (!careTags.length) return CARE_STAGE_FALLBACK;
    return careTags.map((tag, index) => ({
      id: tag.id,
      title: etapTitleForIndex(index),
      name:
        tag.title?.trim() ||
        tag.name.replace(/\s*\(.*?\)\s*/g, '').trim() ||
        tag.name,
      slug: tag.slug,
    }));
  }, [careTags]);

  const orderedSlugs = useMemo(
    () => availableEtaps.map((e) => e.slug!).filter(Boolean),
    [availableEtaps],
  );

  const currentProductEtap = useMemo(() => {
    const hit = (productTagSlugs ?? []).find((s) => isCareStageTag(s));
    return hit ?? null;
  }, [productTagSlugs]);

  const currentEtapMeta = useMemo(
    () => availableEtaps.find((e) => e.slug === currentProductEtap) ?? null,
    [availableEtaps, currentProductEtap],
  );

  return {
    availableEtaps,
    orderedSlugs,
    currentProductEtap,
    currentEtapMeta,
    nextCareStageSlug,
  };
}
