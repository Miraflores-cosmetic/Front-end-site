import type { SkinTask } from '@/types/quiz';

/** Приоритетные группы задач ухода — проверяются сверху вниз (§6.1). */
export const SKIN_TASK_PRIORITIES: readonly SkinTask[][] = [
  ['sensitivity', 'dryness'],
  ['post_acne'],
  ['dark_circles'],
  ['wrinkles', 'good_skin'],
] as const;

/**
 * Возвращает номер приоритета (1–4) по первой совпавшей группе.
 * `null`, если ни одна задача не выбрана.
 */
export function getPriorityIndex(skinTasks: SkinTask[]): number | null {
  for (let i = 0; i < SKIN_TASK_PRIORITIES.length; i++) {
    if (SKIN_TASK_PRIORITIES[i].some((task) => skinTasks.includes(task))) {
      return i + 1;
    }
  }
  return null;
}
