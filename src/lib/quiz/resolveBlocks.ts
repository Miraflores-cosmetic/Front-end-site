import type { FaceResultMeta } from './buildFaceResult';
import { getQuizHtml, getQuizMedia, getQuizPlain } from './contentUtils';
import type { QuizContentMap, ResolvedContentBlock } from '@/types/quizContent';

export function resolveFaceResultBlocks(
  result: FaceResultMeta,
  content: QuizContentMap,
): ResolvedContentBlock[] {
  return result.blocks.map((block) => ({
    texts: block.texts.map((key) => ({
      key,
      html: getQuizHtml(content, key),
      plain: getQuizPlain(content, key),
    })).filter((text) => text.html),
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
