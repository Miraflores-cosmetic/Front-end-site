import { apiFetch, uploadsUrl } from '@/api/apiClient';
import { cardToProductEdge, type JcosProductCard } from '@/api/catalogApi';
import { mapProductNodeToBestSeller } from '@/utils/mapProductNodeToBestSeller';
import type { BestSellersProduct } from '@/types/products';
import { normalizeMediaUrl } from '@/utils/mediaUrl';

export type SiteSeoSettings = {
  siteUrl: string | null;
  titleSuffix: string;
  defaultMetaDescription: string | null;
  defaultOgImageUrl: string | null;
  homeMetaTitle: string | null;
  homeMetaDescription: string | null;
  homeOgImageUrl: string | null;
};

const SITE_SEO_TTL_MS = 60_000;
let siteSeoCache: SiteSeoSettings | null = null;
let siteSeoCachedAt = 0;
let siteSeoInflight: Promise<SiteSeoSettings> | null = null;

function mapSiteSeoSettings(
  res: SiteSeoSettings & { id?: string; updatedAt?: string | null },
): SiteSeoSettings {
  return {
    siteUrl: res.siteUrl ?? null,
    titleSuffix: res.titleSuffix?.trim() || 'Miraflores',
    defaultMetaDescription: res.defaultMetaDescription ?? null,
    defaultOgImageUrl: res.defaultOgImageUrl
      ? uploadsUrl(res.defaultOgImageUrl) || res.defaultOgImageUrl
      : null,
    homeMetaTitle: res.homeMetaTitle ?? null,
    homeMetaDescription: res.homeMetaDescription ?? null,
    homeOgImageUrl: res.homeOgImageUrl
      ? uploadsUrl(res.homeOgImageUrl) || res.homeOgImageUrl
      : null,
  };
}

/** In-flight + memory TTL — PDP/Catalog/Home не дублируют GET /settings/seo. */
export async function getSiteSeoSettings(): Promise<SiteSeoSettings> {
  const fresh = siteSeoCache && Date.now() - siteSeoCachedAt < SITE_SEO_TTL_MS;
  if (fresh && siteSeoCache) return siteSeoCache;

  if (!siteSeoInflight) {
    siteSeoInflight = apiFetch<SiteSeoSettings & { id?: string; updatedAt?: string | null }>(
      '/settings/seo',
    )
      .then((res) => {
        siteSeoCache = mapSiteSeoSettings(res);
        siteSeoCachedAt = Date.now();
        return siteSeoCache;
      })
      .finally(() => {
        siteSeoInflight = null;
      });
  }
  return siteSeoInflight;
}

export type CartSettings = {
  freeShippingThresholdRub: number;
  progressContentText: string;
  progressSuccessText: string;
  legalHtml: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type HeroSlide = {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
};

export type HomepageSetProduct = {
  id: string;
  variantId: string | null;
  variantName?: string | null;
  slug: string;
  name: string;
  productType?: string | null;
  shortDescription: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  imageUrl: string | null;
  imageUrls: string[];
};

export type HomepageSetItem = {
  id: string;
  imageUrl: string | null;
  slug: string;
  name: string;
  product: HomepageSetProduct;
};

export type ApplicableGiftItem = {
  variantId: string;
  productName: string;
  variantName?: string;
  thumbnailUrl?: string | null;
  quantity?: number;
};

export type ApplicableGift = {
  applicable: boolean;
  items?: ApplicableGiftItem[];
  /** @deprecated single-gift compat — первый item */
  variantId?: string;
  productName?: string;
  thumbnailUrl?: string | null;
  quantity?: number;
};

export async function getCartSettings(): Promise<CartSettings> {
  return apiFetch('/settings/cart');
}

export async function getFaqItems(): Promise<FaqItem[]> {
  const res = await apiFetch<{ items: FaqItem[] }>('/settings/faq');
  return res.items ?? [];
}

let heroSlidesCache: HeroSlide[] | null = null;
let heroSlidesInflight: Promise<HeroSlide[]> | null = null;

function mapHeroSlides(res: { items?: HeroSlide[] }): HeroSlide[] {
  return (res.items ?? []).map((s) => ({
    ...s,
    imageUrl: uploadsUrl(s.imageUrl) || s.imageUrl,
    mobileImageUrl: s.mobileImageUrl
      ? uploadsUrl(s.mobileImageUrl) || s.mobileImageUrl
      : null,
  }));
}

/** Warm hero API during SiteLoader (deduped with HomeHero). */
export function prefetchHeroSlides(): void {
  void getHeroSlides();
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (heroSlidesCache) return heroSlidesCache;
  if (!heroSlidesInflight) {
    heroSlidesInflight = apiFetch<{ items: HeroSlide[] }>('/settings/hero')
      .then((res) => {
        heroSlidesCache = mapHeroSlides(res);
        return heroSlidesCache;
      })
      .finally(() => {
        heroSlidesInflight = null;
      });
  }
  return heroSlidesInflight;
}

export type HomePromoBanner = {
  id: string;
  imageUrl: string;
  href: string;
  alt: string;
  notch: boolean;
};

export type HomePromoPayload = {
  titleLeft: string;
  titleRight: string;
  items: HomePromoBanner[];
};

export async function getHomePromo(): Promise<HomePromoPayload> {
  const res = await apiFetch<HomePromoPayload>('/settings/home-promo');
  return {
    titleLeft: res.titleLeft?.trim() || 'НАШИ',
    titleRight: res.titleRight?.trim() || 'АКЦИИ',
    items: (res.items ?? []).map((it) => ({
      ...it,
      imageUrl: uploadsUrl(it.imageUrl) || it.imageUrl,
      href: it.href?.trim() || '/catalog',
      alt: it.alt ?? '',
      notch: Boolean(it.notch),
    })),
  };
}

export async function getHomepageSets(): Promise<HomepageSetItem[]> {
  const res = await apiFetch<{ items: HomepageSetItem[] }>('/settings/homepage-sets');
  return (res.items ?? []).map((s) => {
    const product = s.product
      ? {
          ...s.product,
          imageUrl: s.product.imageUrl
            ? uploadsUrl(s.product.imageUrl) || s.product.imageUrl
            : null,
          imageUrls: (s.product.imageUrls ?? [])
            .map((u) => uploadsUrl(u) || u)
            .filter(Boolean),
          discountPercent: s.product.discountPercent ?? null,
          variantId: s.product.variantId ?? null,
        }
      : s.product;
    if (product && product.imageUrls.length === 0 && product.imageUrl) {
      product.imageUrls = [product.imageUrl];
    }
    return {
      ...s,
      imageUrl: s.imageUrl ? uploadsUrl(s.imageUrl) || s.imageUrl : null,
      product,
    };
  });
}

export type GratitudeTierPublic = {
  id: string;
  sortOrder: number;
  title: string;
  infoHtml: string;
  imageUrl: string | null;
};

export type GratitudePublic = {
  articleSlug: string | null;
  tiers: GratitudeTierPublic[];
};

export async function getGratitudeProgram(): Promise<GratitudePublic> {
  const res = await apiFetch<GratitudePublic>('/settings/gratitude');
  return {
    articleSlug: res.articleSlug?.trim() || null,
    tiers: (res.tiers ?? []).map((t) => ({
      ...t,
      imageUrl: t.imageUrl ? normalizeMediaUrl(t.imageUrl) || null : null,
    })),
  };
}

export async function getApplicableGift(subtotal: number): Promise<ApplicableGift> {
  const res = await apiFetch<ApplicableGift>('/settings/applicable-gift', {
    query: { subtotal: Math.round(subtotal) },
  });
  if (res.thumbnailUrl) {
    res.thumbnailUrl = uploadsUrl(res.thumbnailUrl) || res.thumbnailUrl;
  }
  if (res.items?.length) {
    res.items = res.items.map((it) => ({
      ...it,
      thumbnailUrl: it.thumbnailUrl
        ? uploadsUrl(it.thumbnailUrl) || it.thumbnailUrl
        : it.thumbnailUrl,
    }));
  }
  return res;
}

export type QuizContentPayload = {
  content: Record<
    string,
    { plain: string; html: string; mediaUrl: string | null; mediaType: string | null }
  >;
};

export async function getQuizContent(): Promise<QuizContentPayload> {
  const res = await apiFetch<QuizContentPayload>('/settings/quiz-content');
  const content: QuizContentPayload['content'] = {};
  for (const [key, item] of Object.entries(res.content ?? {})) {
    content[key] = {
      ...item,
      mediaUrl: item.mediaUrl ? normalizeMediaUrl(item.mediaUrl) || item.mediaUrl : null,
    };
  }
  return { content };
}

export type MenuSettingsProduct = {
  id: string;
  variantId: string | null;
  slug: string;
  name: string;
  productType?: string | null;
  shortDescription: string | null;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  imageUrl: string | null;
  imageUrls: string[];
};

export type MenuSettings = {
  annotationText: string;
  product: MenuSettingsProduct | null;
};

/** Mapped Home CMS bundle (see docs/settings-home.md). */
export type HomeCmsBundle = {
  hero: HeroSlide[];
  promo: HomePromoPayload;
  sets: HomepageSetItem[];
  faq: FaqItem[];
  gratitude: GratitudePublic;
  bestsellers: BestSellersProduct[];
  generatedAt: string;
};

type HomeBundleRaw = {
  hero: { items?: HeroSlide[] };
  promo: HomePromoPayload;
  sets: { items?: HomepageSetItem[] };
  faq: { items?: FaqItem[] };
  gratitude: GratitudePublic;
  bestsellers: { items?: JcosProductCard[]; total?: number };
  generatedAt?: string;
};

const HOME_BUNDLE_TTL_MS = 60_000;
let homeBundleCache: HomeCmsBundle | null = null;
let homeBundleCachedAt = 0;
let homeBundleInflight: Promise<HomeCmsBundle> | null = null;

function mapHomepageSetsItems(items: HomepageSetItem[]): HomepageSetItem[] {
  return (items ?? []).map((s) => {
    const product = s.product
      ? {
          ...s.product,
          imageUrl: s.product.imageUrl
            ? uploadsUrl(s.product.imageUrl) || s.product.imageUrl
            : null,
          imageUrls: (s.product.imageUrls ?? [])
            .map((u) => uploadsUrl(u) || u)
            .filter(Boolean),
          discountPercent: s.product.discountPercent ?? null,
          variantId: s.product.variantId ?? null,
        }
      : s.product;
    if (product && product.imageUrls.length === 0 && product.imageUrl) {
      product.imageUrls = [product.imageUrl];
    }
    return {
      ...s,
      imageUrl: s.imageUrl ? uploadsUrl(s.imageUrl) || s.imageUrl : null,
      product,
    };
  });
}

function mapHomeBundleRaw(res: HomeBundleRaw): HomeCmsBundle {
  const hero = mapHeroSlides(res.hero ?? {});
  heroSlidesCache = hero;

  const promo: HomePromoPayload = {
    titleLeft: res.promo?.titleLeft?.trim() || 'НАШИ',
    titleRight: res.promo?.titleRight?.trim() || 'АКЦИИ',
    items: (res.promo?.items ?? []).map((it) => ({
      ...it,
      imageUrl: uploadsUrl(it.imageUrl) || it.imageUrl,
      href: it.href?.trim() || '/catalog',
      alt: it.alt ?? '',
      notch: Boolean(it.notch),
    })),
  };

  const gratitudeRaw = res.gratitude ?? { articleSlug: null, tiers: [] };
  const gratitude: GratitudePublic = {
    articleSlug: gratitudeRaw.articleSlug?.trim() || null,
    tiers: (gratitudeRaw.tiers ?? []).map((t) => ({
      ...t,
      imageUrl: t.imageUrl ? normalizeMediaUrl(t.imageUrl) || null : null,
    })),
  };

  const bestsellers = (res.bestsellers?.items ?? []).map((card) =>
    mapProductNodeToBestSeller(cardToProductEdge(card).node),
  );

  return {
    hero,
    promo,
    sets: mapHomepageSetsItems(res.sets?.items ?? []),
    faq: res.faq?.items ?? [],
    gratitude,
    bestsellers,
    generatedAt: res.generatedAt ?? new Date().toISOString(),
  };
}

/** Warm Home CMS during SiteLoader (deduped). */
export function prefetchHomeBundle(): void {
  void getHomeBundle();
}

export async function getHomeBundle(): Promise<HomeCmsBundle> {
  const fresh =
    homeBundleCache && Date.now() - homeBundleCachedAt < HOME_BUNDLE_TTL_MS;
  if (fresh && homeBundleCache) return homeBundleCache;

  if (!homeBundleInflight) {
    homeBundleInflight = apiFetch<HomeBundleRaw>('/settings/home')
      .then((res) => {
        homeBundleCache = mapHomeBundleRaw(res);
        homeBundleCachedAt = Date.now();
        return homeBundleCache;
      })
      .finally(() => {
        homeBundleInflight = null;
      });
  }
  return homeBundleInflight;
}

export async function getMenuSettings(): Promise<MenuSettings> {
  const res = await apiFetch<MenuSettings>('/settings/menu');
  const product = res.product
    ? {
        ...res.product,
        imageUrl: res.product.imageUrl
          ? uploadsUrl(res.product.imageUrl) || res.product.imageUrl
          : null,
        imageUrls: (res.product.imageUrls ?? [])
          .map((u) => uploadsUrl(u) || u)
          .filter(Boolean),
        discountPercent: res.product.discountPercent ?? null,
        variantId: res.product.variantId ?? null,
      }
    : null;
  if (product && product.imageUrls.length === 0 && product.imageUrl) {
    product.imageUrls = [product.imageUrl];
  }
  return {
    annotationText: res.annotationText ?? '',
    product,
  };
}
