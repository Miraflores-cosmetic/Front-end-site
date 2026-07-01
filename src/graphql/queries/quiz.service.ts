import { getPageBySlug, type PageNode } from '@/graphql/queries/pages.service';
import { QUIZ_PAGE_SLUG } from '@/config/quizContent';
import {
  attributeSlugToContentKey,
  buildContentItemFromParts,
  mergeQuizContent,
  parseApiContentPayload,
} from '@/lib/quiz/contentUtils';
import type { QuizContentMap } from '@/types/quizContent';

interface ApiQuizContentResponse {
  success: boolean;
  source?: 'cms' | 'fallback';
  content?: Record<
    string,
    {
      plain?: string | null;
      richText?: unknown;
      mediaUrl?: string | null;
    }
  >;
}

type QuizContentLoadResult = {
  content: QuizContentMap;
  source: 'cms' | 'fallback' | 'mixed';
};

let cachedContent: QuizContentMap | null = null;
let cachedSource: QuizContentLoadResult['source'] = 'fallback';
let loadPromise: Promise<QuizContentLoadResult> | null = null;

function parsePageAttributes(page: PageNode): QuizContentMap {
  const map: QuizContentMap = {};

  for (const attr of page.assignedAttributes ?? []) {
    const key = attributeSlugToContentKey(attr.attribute.slug);
    const item = buildContentItemFromParts({
      plain: typeof attr.textValue === 'string' ? attr.textValue : null,
      richText: attr.richTextValue,
      mediaUrl: attr.fileValue?.url ?? attr.value?.url ?? null,
    });
    if (item) map[key] = item;
  }

  return map;
}

async function fetchQuizContentFromApi(): Promise<QuizContentMap | null> {
  try {
    const res = await fetch('/api/quiz/content/');
    if (!res.ok) return null;

    const json = (await res.json()) as ApiQuizContentResponse;
    if (!json.success || !json.content) return null;

    const parsed = parseApiContentPayload(json.content);
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchQuizContentFromGraphql(): Promise<QuizContentMap | null> {
  try {
    const page = await getPageBySlug(QUIZ_PAGE_SLUG);
    if (!page?.isPublished) return null;
    return parsePageAttributes(page);
  } catch {
    return null;
  }
}

export async function loadQuizContent(): Promise<QuizContentLoadResult> {
  if (cachedContent) {
    return { content: cachedContent, source: cachedSource };
  }

  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const fromApi = await fetchQuizContentFromApi();
    const fromGraphql = fromApi ? null : await fetchQuizContentFromGraphql();
    const cmsMap = fromApi ?? fromGraphql ?? {};
    const hasCms = Object.keys(cmsMap).length > 0;
    const { content, source } = mergeQuizContent(cmsMap, hasCms ? 'cms' : 'fallback');

    cachedContent = content;
    cachedSource = source;
    return { content, source };
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export function clearQuizContentCache() {
  cachedContent = null;
  cachedSource = 'fallback';
  loadPromise = null;
}

export function getCachedQuizContent(): QuizContentLoadResult | null {
  if (!cachedContent) return null;
  return { content: cachedContent, source: cachedSource };
}
