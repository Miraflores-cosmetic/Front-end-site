import type { QuizContentMap, ResolvedContentBlock } from '@/types/quizContent';
import { getQuizHtml } from './contentUtils';

/** Есть ли хотя бы один видимый блок (текст или медиа) после resolve. */
export function hasVisibleQuizResultBlocks(blocks: ResolvedContentBlock[]): boolean {
  return blocks.some((b) => b.texts.length > 0 || b.media.length > 0);
}

/** CMS-ключ результата заполнен (plain или html). */
export function isQuizContentKeyConfigured(content: QuizContentMap, key: string): boolean {
  const item = content[key];
  if (item?.html?.trim() || item?.plain?.trim()) return true;
  return Boolean(getQuizHtml(content, key));
}
