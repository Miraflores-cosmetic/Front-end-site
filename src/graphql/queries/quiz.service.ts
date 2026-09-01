import { getQuizContent } from '@/api/settingsApi';
import {
  buildContentItemFromParts,
  mergeQuizContent,
  parseApiContentPayload,
} from '@/lib/quiz/contentUtils';
import type { QuizContentMap } from '@/types/quizContent';

type QuizContentLoadResult = {
  content: QuizContentMap;
  source: 'cms' | 'fallback' | 'mixed';
};

let cachedContent: QuizContentMap | null = null;
let cachedSource: QuizContentLoadResult['source'] = 'fallback';
let loadPromise: Promise<QuizContentLoadResult> | null = null;

async function fetchQuizContentFromApi(): Promise<QuizContentMap | null> {
  try {
    const json = await getQuizContent();
    if (!json.content) return null;
    const mapped: Record<string, { plain?: string | null; richText?: unknown; mediaUrl?: string | null }> = {};
    for (const [key, val] of Object.entries(json.content)) {
      mapped[key] = {
        plain: val.plain,
        richText: val.html || undefined,
        mediaUrl: val.mediaUrl,
      };
    }
    const parsed = parseApiContentPayload(mapped);
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadQuizContent(): Promise<QuizContentLoadResult> {
  if (cachedContent) return { content: cachedContent, source: cachedSource };
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const fromApi = await fetchQuizContentFromApi();
    const hasCms = Boolean(fromApi && Object.keys(fromApi).length > 0);
    const cmsMap = fromApi ?? {};
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
