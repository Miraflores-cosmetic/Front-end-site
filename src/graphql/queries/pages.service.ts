import { getCmsPage } from '@/api/cmsApi';
import { fetchCatalogTags } from '@/api/catalogApi';
import {
  getCartSettings,
  getHeroSlides,
  getHomepageSets,
} from '@/api/settingsApi';
import { uploadsUrl } from '@/api/apiClient';
import {
  CMS_LEGAL_SLUGS,
  resolveInfoCmsSlug,
} from '@/config/infoCmsSlugs';

export interface PageNode {
  id: string;
  slug: string;
  title: string;
  content?: string | null;
  created: string;
  isPublished: boolean;
  pageType?: { id: string; name: string; slug: string };
  metadata?: { key: string; value: string }[];
  assignedAttributes?: Array<{
    attribute?: { id: string; slug: string; name: string };
    fileValue?: { url: string };
    textValue?: string;
    richTextValue?: unknown;
    value?: { url: string };
  }>;
}

export interface SinglePageResponse {
  page: PageNode | null;
}

function cmsToPageNode(row: Awaited<ReturnType<typeof getCmsPage>>): PageNode | null {
  if (!row) return null;
  return {
    id: row.id || row.slug,
    slug: row.slug,
    title: row.title,
    content: row.bodyHtml,
    created: row.publishedAt || new Date().toISOString(),
    isPublished: row.isPublished !== false,
  };
}

export async function getPageBySlug(slug: string): Promise<PageNode | null> {
  const clean = slug.replace(/^info\//, '').trim();
  const aliased = resolveInfoCmsSlug(clean);
  const knownCms = new Set<string>([
    ...CMS_LEGAL_SLUGS,
    'about',
    'programma-blagodarnosti',
  ]);
  const cmsSlug = aliased || (knownCms.has(clean) ? clean : null);

  if (cmsSlug) {
    return cmsToPageNode(await getCmsPage(cmsSlug));
  }

  if (clean === 'slaider') {
    const slides = await getHeroSlides();
    const attrs: Array<{
      attribute: { id: string; slug: string; name: string };
      fileValue?: { url: string };
      textValue?: string;
    }> = [];
    slides.forEach((s, i) => {
      const n = i + 1;
      attrs.push({
        attribute: {
          id: `large-${n}`,
          slug: `bolshaya-kartinka-${n}`,
          name: `Большая картинка - ${n}`,
        },
        fileValue: { url: s.imageUrl },
      });
      if (s.mobileImageUrl) {
        attrs.push({
          attribute: {
            id: `small-${n}`,
            slug: `malenkaya-kartinka-${n}`,
            name: `Маленькая картинка - ${n}`,
          },
          fileValue: { url: s.mobileImageUrl },
        });
      }
    });
    return {
      id: 'hero',
      slug: clean,
      title: 'Hero',
      content: null,
      created: new Date().toISOString(),
      isPublished: true,
      assignedAttributes: attrs,
    };
  }

  return cmsToPageNode(await getCmsPage(clean));
}

export interface ProgressBarCartModel {
  contentText: string;
  threshold: number;
  successText: string;
}

const DEFAULT_THRESHOLD = 15780;
const DEFAULT_CONTENT = 'до бесплатной доставки до ПВЗ';
const DEFAULT_SUCCESS = 'Бесплатная доставка до ПВЗ!';

export async function getProgressBarCartModel(): Promise<ProgressBarCartModel> {
  try {
    const cart = await getCartSettings();
    return {
      contentText: cart.progressContentText || DEFAULT_CONTENT,
      threshold: cart.freeShippingThresholdRub || DEFAULT_THRESHOLD,
      successText: cart.progressSuccessText || DEFAULT_SUCCESS,
    };
  } catch {
    return { contentText: DEFAULT_CONTENT, threshold: DEFAULT_THRESHOLD, successText: DEFAULT_SUCCESS };
  }
}

export interface StepData {
  id: number | string;
  slug: string;
  title: string;
  description: string;
  image?: string;
}

/** Первые контекстные теги для блока «шаги» на главной. */
export async function getAllSteps(limit = 4): Promise<StepData[]> {
  try {
    const { items } = await fetchCatalogTags();
    return items.slice(0, limit).map((tag, idx) => ({
      id: tag.id || idx + 1,
      slug: tag.slug,
      title: tag.title?.trim() || tag.name,
      description: tag.description?.trim() || '',
      image: tag.coverImageUrl ? uploadsUrl(tag.coverImageUrl) || tag.coverImageUrl : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getSetImageFromModel(_pageId: string): Promise<string | null> {
  const sets = await getHomepageSets();
  return sets[0]?.imageUrl ?? null;
}

export async function getAllSets(): Promise<{ bySlug: Map<string, string>; byName: Map<string, string> }> {
  const sets = await getHomepageSets();
  const bySlug = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const s of sets) {
    if (s.imageUrl && s.slug) bySlug.set(s.slug, s.imageUrl);
    if (s.imageUrl && s.name) byName.set(s.name.toLowerCase(), s.imageUrl);
  }
  return { bySlug, byName };
}

export async function getCartTextPage(): Promise<PageNode | null> {
  try {
    const cart = await getCartSettings();
    return {
      id: 'cart-legal',
      slug: 'cart-text',
      title: 'Корзина',
      content: cart.legalHtml,
      created: new Date().toISOString(),
      isPublished: true,
    };
  } catch {
    return null;
  }
}
