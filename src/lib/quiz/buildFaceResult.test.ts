import { describe, expect, it } from 'vitest';
import { buildFaceResult, type CompleteFaceQuizAnswers } from './buildFaceResult';
import { getPriorityIndex } from './priorities';

const baseAnswers: CompleteFaceQuizAnswers = {
  skin_age: 'young',
  spf: 'yes',
  skin_issues: ['comedones'],
  skin_tasks: ['sensitivity'],
  swelling: 'no',
  selfie_count: 0,
};

describe('getPriorityIndex', () => {
  it('returns 1 for sensitivity', () => {
    expect(getPriorityIndex(['sensitivity'])).toBe(1);
  });

  it('returns 1 for dryness', () => {
    expect(getPriorityIndex(['dryness'])).toBe(1);
  });

  it('returns 2 for post_acne', () => {
    expect(getPriorityIndex(['post_acne'])).toBe(2);
  });

  it('returns 3 for dark_circles', () => {
    expect(getPriorityIndex(['dark_circles'])).toBe(3);
  });

  it('returns 4 for wrinkles and good_skin', () => {
    expect(getPriorityIndex(['wrinkles'])).toBe(4);
    expect(getPriorityIndex(['good_skin'])).toBe(4);
  });

  it('picks highest priority when multiple groups match', () => {
    expect(getPriorityIndex(['wrinkles', 'sensitivity'])).toBe(1);
    expect(getPriorityIndex(['post_acne', 'dark_circles'])).toBe(2);
  });

  it('returns null for empty tasks', () => {
    expect(getPriorityIndex([])).toBeNull();
  });
});

describe('buildFaceResult — SPF', () => {
  it('uses step_1_spf + file_2 when spf=yes', () => {
    const { blocks } = buildFaceResult({ ...baseAnswers, spf: 'yes' });
    expect(blocks[0]).toEqual({ texts: ['step_1_spf'], media: ['file_2'] });
  });

  it('uses step_1_nospf + file_3 when spf=no', () => {
    const { blocks } = buildFaceResult({ ...baseAnswers, spf: 'no' });
    expect(blocks[0]).toEqual({ texts: ['step_1_nospf'], media: ['file_3'] });
  });
});

describe('buildFaceResult — empty skin_tasks', () => {
  it('returns no_answers without end_face_care', () => {
    const { priority, blocks } = buildFaceResult({ ...baseAnswers, skin_tasks: [] });
    expect(priority).toBeNull();
    expect(blocks).toEqual([
      { texts: ['step_1_spf'], media: ['file_2'] },
      { texts: ['no_answers'], media: [] },
    ]);
  });
});

describe('buildFaceResult — matrix young × priority', () => {
  const cases: Array<{ tasks: CompleteFaceQuizAnswers['skin_tasks']; texts: string[]; media: string[] }> = [
    { tasks: ['sensitivity'], texts: ['other_steps_1'], media: ['file_4', 'file_4.1'] },
    { tasks: ['post_acne'], texts: ['other_steps_2'], media: ['file_5', 'file_5.1'] },
    { tasks: ['dark_circles'], texts: ['other_steps_3'], media: ['file_6', 'file_6.1'] },
    { tasks: ['wrinkles'], texts: ['other_steps_4'], media: ['file_7', 'file_7.1'] },
  ];

  it.each(cases)('young priority for $tasks', ({ tasks, texts, media }) => {
    const { priority, blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'young',
      skin_tasks: tasks,
    });
    expect(priority).toBeGreaterThan(0);
    expect(blocks[1]).toEqual({ texts, media });
    expect(blocks.at(-1)).toEqual({ texts: ['end_face_care'], media: [] });
  });
});

describe('buildFaceResult — matrix mature × priority', () => {
  const cases: Array<{ tasks: CompleteFaceQuizAnswers['skin_tasks']; texts: string[]; media: string[] }> = [
    { tasks: ['dryness'], texts: ['other_steps_5'], media: ['file_8'] },
    { tasks: ['post_acne'], texts: ['other_steps_6'], media: ['file_9', 'file_9.1'] },
    { tasks: ['dark_circles'], texts: ['other_steps_7'], media: ['file_10', 'file_10.1'] },
    {
      tasks: ['good_skin'],
      texts: ['other_steps_8_1', 'other_steps_8_2'],
      media: ['file_11', 'file_12'],
    },
  ];

  it.each(cases)('mature priority for $tasks', ({ tasks, texts, media }) => {
    const { blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'mature',
      skin_tasks: tasks,
    });
    expect(blocks[1]).toEqual({ texts, media });
  });
});

describe('buildFaceResult — swelling', () => {
  it('adds face_edema for young priority 1', () => {
    const { blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'young',
      skin_tasks: ['sensitivity'],
      swelling: 'yes',
    });
    expect(blocks).toContainEqual({ texts: ['face_edema'], media: [] });
  });

  it('adds face_edema2 for young priority 2+', () => {
    const { blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'young',
      skin_tasks: ['post_acne'],
      swelling: 'yes',
    });
    expect(blocks).toContainEqual({ texts: ['face_edema2'], media: [] });
  });

  it('adds face_edema for mature priority 1', () => {
    const { blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'mature',
      skin_tasks: ['dryness'],
      swelling: 'yes',
    });
    expect(blocks).toContainEqual({ texts: ['face_edema'], media: [] });
  });

  it('adds face_edema2 for mature priority 2+', () => {
    const { blocks } = buildFaceResult({
      ...baseAnswers,
      skin_age: 'mature',
      skin_tasks: ['post_acne'],
      swelling: 'yes',
    });
    expect(blocks).toContainEqual({ texts: ['face_edema2'], media: [] });
  });

  it('skips edema block when swelling=no', () => {
    const { blocks } = buildFaceResult({ ...baseAnswers, swelling: 'no' });
    expect(blocks.some((b) => b.texts.includes('face_edema'))).toBe(false);
    expect(blocks.some((b) => b.texts.includes('face_edema2'))).toBe(false);
  });
});

describe('buildFaceResult — full sequence', () => {
  it('ends with end_face_care when priority exists', () => {
    const { blocks } = buildFaceResult(baseAnswers);
    expect(blocks.at(-1)).toEqual({ texts: ['end_face_care'], media: [] });
  });

  it('returns priority in meta', () => {
    expect(buildFaceResult(baseAnswers).priority).toBe(1);
  });
});
