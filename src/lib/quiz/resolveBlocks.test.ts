import { describe, expect, it } from 'vitest';
import { buildFaceResult } from './buildFaceResult';
import { resolveFaceResultBlocks } from './resolveBlocks';
import { buildContentItemFromParts, mergeQuizContent } from './contentUtils';
import type { QuizContentMap } from '@/types/quizContent';

const STEP_1_SPF_RICH_TEXT = {
  blocks: [
    { type: 'paragraph', data: { text: 'На основе ваших ответов мы предлагаем попробовать следующий уход:' } },
    { type: 'paragraph', data: { text: '<b>ШАГ 1. Очищение</b>' } },
    { type: 'paragraph', data: { text: 'ГИДРОФИЛЬНОЕ МАСЛО ' } },
    { type: 'paragraph', data: { text: 'Гидрофильное масло идеально подходит для чувствительной кожи.' } },
    {
      type: 'paragraph',
      data: {
        text: 'https://miraflores-shop.com/product/gidrofilnoe-maslo-mat-i-machekha-i-kalendula',
      },
    },
  ],
};

const sampleContent: QuizContentMap = {
  step_1_spf: {
    plain: 'Используйте SPF ежедневно',
    html: '<p>Используйте SPF ежедневно</p>',
    mediaUrl: null,
    mediaType: null,
  },
  file_2: {
    plain: null,
    html: null,
    mediaUrl: 'https://example.com/spf.jpg',
    mediaType: 'image',
  },
};

describe('resolveFaceResultBlocks', () => {
  it('resolves text and media from content map', () => {
    const result = buildFaceResult({
      skin_age: 'young',
      spf: 'yes',
      skin_issues: [],
      skin_tasks: ['sensitivity'],
      swelling: 'no',
      selfie_count: 0,
    });

    const { content } = mergeQuizContent(sampleContent, 'cms');
    const resolved = resolveFaceResultBlocks(result, content);

    expect(resolved[0].texts[0].plain).toBe('Используйте SPF ежедневно');
    expect(resolved[0].media[0]?.url).toBe('https://example.com/spf.jpg');
  });

  it('resolves step_1_spf with product card slug from CMS rich text', () => {
    const item = buildContentItemFromParts({ richText: STEP_1_SPF_RICH_TEXT });
    const cmsMap: QuizContentMap = {
      step_1_spf: item!,
      file_2: {
        plain: null,
        html: null,
        mediaUrl: 'https://example.com/spf.jpg',
        mediaType: 'image',
      },
    };

    const result = buildFaceResult({
      skin_age: 'young',
      spf: 'yes',
      skin_issues: [],
      skin_tasks: ['sensitivity'],
      swelling: 'no',
      selfie_count: 0,
    });

    const { content } = mergeQuizContent(cmsMap, 'cms');
    const resolved = resolveFaceResultBlocks(result, content);
    const spfBlock = resolved[0]?.texts[0];

    expect(spfBlock?.key).toBe('step_1_spf');
    expect(spfBlock?.productSlugs).toEqual(['gidrofilnoe-maslo-mat-i-machekha-i-kalendula']);
    expect(spfBlock?.introHtml).toContain('<b>ШАГ 1. Очищение</b>');
    expect(spfBlock?.introHtml).not.toContain('/product/');
  });
});
