import type { FaceResultMeta } from './buildFaceResult';
import { getQuizHtml, getQuizMedia, getQuizPlain } from './contentUtils';
import type { QuizContentMap, ResolvedContentBlock, ResolvedTextBlock } from '@/types/quizContent';

export function resolveFaceResultBlocks(
  result: FaceResultMeta,
  content: QuizContentMap,
): ResolvedContentBlock[] {
  return result.blocks.map((block) => ({
    texts: block.texts
      .map((key): ResolvedTextBlock | null => {
        const html = getQuizHtml(content, key);
        if (!html) return null;
        return {
          key,
          html,
          plain: getQuizPlain(content, key),
        };
      })
      .filter((text): text is ResolvedTextBlock => text !== null),
    media: block.media
      .map((key) => {
        const item = getQuizMedia(content, key);
        if (!item?.mediaUrl || !item.mediaType) return null;
        return {
          key,
          url: item.mediaUrl,
          mediaType: item.mediaType,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  }));
}
