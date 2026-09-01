import { describe, expect, it } from 'vitest';
import { INITIAL_FACE_ANSWERS } from '@/types/quiz';
import { getFaceStepGuardRedirect } from './faceStepGuard';

describe('getFaceStepGuardRedirect', () => {
  it('redirects mid-step deep-link without prior answers to the first step', () => {
    expect(getFaceStepGuardRedirect('tasks', INITIAL_FACE_ANSWERS)).toBe('/quiz/face');
    expect(getFaceStepGuardRedirect('swelling', INITIAL_FACE_ANSWERS)).toBe('/quiz/face');
  });

  it('allows issues after age and spf', () => {
    const answers = {
      ...INITIAL_FACE_ANSWERS,
      skin_age: 'young' as const,
      spf: 'yes' as const,
    };

    expect(getFaceStepGuardRedirect('issues', answers)).toBeNull();
  });

  it('redirects to issues when skin_issues are empty', () => {
    const answers = {
      ...INITIAL_FACE_ANSWERS,
      skin_age: 'young' as const,
      spf: 'yes' as const,
    };

    expect(getFaceStepGuardRedirect('tasks', answers)).toBe('/quiz/face/issues');
    expect(getFaceStepGuardRedirect('swelling', answers)).toBe('/quiz/face/issues');
  });

  it('redirects swelling when tasks are not selected', () => {
    const answers = {
      ...INITIAL_FACE_ANSWERS,
      skin_age: 'young' as const,
      spf: 'yes' as const,
      skin_issues: ['comedones' as const],
    };

    expect(getFaceStepGuardRedirect('swelling', answers)).toBe('/quiz/face/tasks');
  });
});
