import { describe, expect, it } from 'vitest';
import { buildFaceResult } from './buildFaceResult';
import { resolveFaceResultBlocks } from './resolveBlocks';
import { mergeQuizContent } from './contentUtils';
import type { QuizContentMap } from '@/types/quizContent';

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
});
