/**
 * Сохранённый результат квиза в ЛК (GET/PUT /account/me/quiz-result).
 */
import { ApiError, apiFetch, apiJson } from '@/api/apiClient';
import { isSavedQuizResult } from '@/lib/quiz/savedQuizResult';
import type { SavedQuizResult, SavedQuizResultResponse } from '@/types/quizResult';

export type SaveQuizResultOutcome =
  | { ok: true }
  | { ok: false; error: string };

export async function fetchSavedQuizResult(): Promise<SavedQuizResult | null> {
  try {
    const res = await apiFetch<SavedQuizResultResponse>('/account/me/quiz-result');
    if (res?.result && isSavedQuizResult(res.result)) {
      return res.result;
    }
    return null;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
      return null;
    }
    return null;
  }
}

export async function saveQuizResult(payload: SavedQuizResult): Promise<SaveQuizResultOutcome> {
  try {
    const res = await apiJson<SavedQuizResultResponse>(
      '/account/me/quiz-result',
      'PUT',
      payload,
    );
    if (res?.result && isSavedQuizResult(res.result)) {
      return { ok: true };
    }
    return { ok: false, error: 'Не удалось сохранить программу ухода.' };
  } catch (e) {
    const message =
      e instanceof ApiError && e.message
        ? e.message
        : 'Не удалось сохранить программу ухода. Попробуйте ещё раз.';
    return { ok: false, error: message };
  }
}
