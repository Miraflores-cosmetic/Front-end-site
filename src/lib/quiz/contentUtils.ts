import { editorJsToHtml } from '@/utils/editorJsParser';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
import { QUIZ_TEXT_FALLBACKS } from '@/config/quizContent';
import type { QuizContentItem, QuizContentMap, QuizMediaType } from '@/types/quizContent';

const EMPTY_ITEM: QuizContentItem = {
  plain: null,
  html: null,
  mediaUrl: null,
  mediaType: null,
};

/** Нормализует slug атрибута Saleor → ключ из spec (`file-1-1` → `file_1.1`). */
export function attributeSlugToContentKey(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (/^file[-_]?1[-_.]?1$/.test(normalized)) return 'file_1.1';
  if (/^file[-_]?4[-_.]?1$/.test(normalized)) return 'file_4.1';
  if (/^file[-_]?5[-_.]?1$/.test(normalized)) return 'file_5.1';
  if (/^file[-_]?6[-_.]?1$/.test(normalized)) return 'file_6.1';
  if (/^file[-_]?7[-_.]?1$/.test(normalized)) return 'file_7.1';
  if (/^file[-_]?9[-_.]?1$/.test(normalized)) return 'file_9.1';
  if (/^file[-_]?10[-_.]?1$/.test(normalized)) return 'file_10.1';
  return normalized.replace(/-/g, '_');
}

export function detectMediaType(url: string): QuizMediaType {
  const path = url.split('?')[0].toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)$/.test(path)) return 'image';
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return 'video';
  if (/\.pdf$/.test(path)) return 'pdf';
  return 'unknown';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContentItemFromParts(parts: {
  plain?: string | null;
  richText?: unknown;
  mediaUrl?: string | null;
}): QuizContentItem | null {
  const item: QuizContentItem = { ...EMPTY_ITEM };

  if (parts.mediaUrl) {
    const url = normalizeMediaUrl(parts.mediaUrl);
    item.mediaUrl = url;
    item.mediaType = detectMediaType(url);
  }

  if (parts.plain?.trim()) {
    item.plain = parts.plain.trim();
    item.html = `<p>${escapeHtml(parts.plain.trim())}</p>`;
  }

  if (parts.richText) {
    const html = editorJsToHtml(parts.richText);
    if (html) {
      item.html = html;
      item.plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const hasContent = item.html || item.plain || item.mediaUrl;
  return hasContent ? item : null;
}

export function mergeQuizContent(
  cmsContent: QuizContentMap,
  source: 'cms' | 'fallback',
): { content: QuizContentMap; source: 'cms' | 'fallback' | 'mixed' } {
  const merged: QuizContentMap = {};
  let usedCms = false;
  let usedFallback = false;

  for (const [key, fallbackText] of Object.entries(QUIZ_TEXT_FALLBACKS)) {
    const cmsItem = cmsContent[key];
    if (cmsItem?.html || cmsItem?.plain) {
      merged[key] = cmsItem;
      usedCms = true;
    } else {
      merged[key] = {
        plain: fallbackText,
        html: `<p>${escapeHtml(fallbackText)}</p>`,
        mediaUrl: null,
        mediaType: null,
      };
      usedFallback = true;
    }
  }

  for (const [key, cmsItem] of Object.entries(cmsContent)) {
    if (merged[key]) continue;
    if (cmsItem.mediaUrl || cmsItem.html || cmsItem.plain) {
      merged[key] = cmsItem;
      usedCms = true;
    }
  }

  const resolvedSource =
    usedCms && usedFallback ? 'mixed' : usedCms ? source : 'fallback';

  return { content: merged, source: resolvedSource };
}

export function getQuizPlain(content: QuizContentMap, key: string): string {
  const item = content[key];
  if (item?.plain) return item.plain;
  const fallback = QUIZ_TEXT_FALLBACKS[key];
  return fallback ?? key;
}

export function getQuizHtml(content: QuizContentMap, key: string): string | null {
  const item = content[key];
  if (item?.html) return item.html;
  const fallback = QUIZ_TEXT_FALLBACKS[key];
  return fallback ? `<p>${escapeHtml(fallback)}</p>` : null;
}

export function getQuizMedia(content: QuizContentMap, key: string): QuizContentItem | null {
  const item = content[key];
  if (item?.mediaUrl) return item;
  return null;
}

export function parseApiContentPayload(
  raw: Record<string, { plain?: string | null; richText?: unknown; mediaUrl?: string | null }>,
): QuizContentMap {
  const map: QuizContentMap = {};

  for (const [key, value] of Object.entries(raw)) {
    const item = buildContentItemFromParts({
      plain: value.plain,
      richText: value.richText,
      mediaUrl: value.mediaUrl,
    });
    if (item) map[key] = item;
  }

  return map;
}
