import { apiFetch, uploadsUrl } from '@/api/apiClient';
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

export async function getSiteSeoSettings(): Promise<SiteSeoSettings> {
  const res = await apiFetch<SiteSeoSettings & { id?: string; updatedAt?: string | null }>(
    '/settings/seo',
  );
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

export type ApplicableGift = {
  applicable: boolean;
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

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const res = await apiFetch<{ items: HeroSlide[] }>('/settings/hero');
  return (res.items ?? []).map((s) => ({
    ...s,
    imageUrl: uploadsUrl(s.imageUrl) || s.imageUrl,
    mobileImageUrl: s.mobileImageUrl
      ? uploadsUrl(s.mobileImageUrl) || s.mobileImageUrl
      : null,
  }));
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
