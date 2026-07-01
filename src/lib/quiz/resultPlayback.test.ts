import { describe, expect, it } from 'vitest';
import {
  getDelayAfterBlock,
  isEdemaBlock,
  splitResultBlocks,
} from './resultPlayback';
import type { ResolvedContentBlock } from '@/types/quizContent';

const block = (key: string): ResolvedContentBlock => ({
  texts: [{ key, html: `<p>${key}</p>`, plain: key }],
  media: [],
});

describe('splitResultBlocks', () => {
  it('separates end_face_care from content blocks', () => {
    const blocks = [block('step_1_spf'), block('other_steps_1'), block('end_face_care')];
    const { contentBlocks, endBlock } = splitResultBlocks(blocks);
    expect(contentBlocks).toHaveLength(2);
    expect(endBlock?.texts[0].key).toBe('end_face_care');
  });
});

describe('getDelayAfterBlock', () => {
  it('returns 3000ms after SPF block', () => {
    const blocks = [block('step_1_spf'), block('other_steps_1')];
    expect(getDelayAfterBlock(blocks, 0)).toBe(3000);
  });

  it('returns 5000ms before edema block', () => {
    const blocks = [block('step_1_spf'), block('other_steps_1'), block('face_edema2')];
    expect(getDelayAfterBlock(blocks, 1)).toBe(5000);
  });

  it('detects edema blocks', () => {
    expect(isEdemaBlock(block('face_edema'))).toBe(true);
    expect(isEdemaBlock(block('step_1_spf'))).toBe(false);
  });
});
