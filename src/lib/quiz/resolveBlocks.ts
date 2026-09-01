import type { FaceResultMeta } from './buildFaceResult';
import { getQuizHtml, getQuizMedia, getQuizPlain } from './contentUtils';
import { splitQuizIntroAndProducts } from './parseQuizProducts';
import { normalizeMediaUrl } from '@/utils/mediaUrl';
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
        const plain = getQuizPlain(content, key);
        const { introHtml, productSlugs } = splitQuizIntroAndProducts(html, plain);

        return {
          key,
          html,
          plain,
          introHtml: productSlugs.length > 0 ? introHtml : html,
          productSlugs: productSlugs.length > 0 ? productSlugs : undefined,
        };
      })
      .filter((text): text is ResolvedTextBlock => text !== null),
    media: block.media
      .map((key) => {
        const item = getQuizMedia(content, key);
        if (!item?.mediaUrl || !item.mediaType) return null;
        const url = normalizeMediaUrl(item.mediaUrl);
        if (!url) return null;
        return {
          key,
          url,
          mediaType: item.mediaType,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  })).filter((block) => block.texts.length > 0 || block.media.length > 0);
}
