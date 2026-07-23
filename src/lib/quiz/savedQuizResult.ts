import type { CompleteFaceQuizAnswers, FaceResultMeta } from './buildFaceResult';
import type { SavedQuizResult } from '@/types/quizResult';

export function buildSavedQuizPayload(
  answers: CompleteFaceQuizAnswers,
  result: FaceResultMeta,
): SavedQuizResult {
  return {
    version: 1,
    zone: 'face',
    completedAt: new Date().toISOString(),
    answers,
    result: {
      priority: result.priority,
      blockKeys: result.blocks.flatMap((block) => block.texts),
    },
  };
}

export function isSavedQuizResult(value: unknown): value is SavedQuizResult {
  if (!value || typeof value !== 'object') return false;
  const data = value as SavedQuizResult;
  return (
    data.version === 1 &&
    data.zone === 'face' &&
    typeof data.completedAt === 'string' &&
    !!data.answers &&
    Array.isArray(data.result?.blockKeys)
  );
}
