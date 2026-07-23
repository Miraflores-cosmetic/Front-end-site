import { describe, expect, it } from 'vitest';
import { buildFaceResult } from './buildFaceResult';
import { buildSavedQuizPayload } from './savedQuizResult';

describe('buildSavedQuizPayload', () => {
  it('builds payload with answers and block keys', () => {
    const answers = {
      skin_age: 'young' as const,
      spf: 'yes' as const,
      skin_issues: ['comedones'] as const[],
      skin_tasks: ['sensitivity'] as const[],
      swelling: 'yes' as const,
      selfie_count: 0,
    };

    const result = buildFaceResult(answers);
    const payload = buildSavedQuizPayload(answers, result);

    expect(payload.zone).toBe('face');
    expect(payload.version).toBe(1);
    expect(payload.answers).toEqual(answers);
    expect(payload.result.priority).toBe(1);
    expect(payload.result.blockKeys).toContain('step_1_spf');
    expect(payload.result.blockKeys).toContain('face_edema');
  });
});
