import {
  AGE_OPTIONS,
  SKIN_ISSUE_OPTIONS,
  SKIN_TASK_OPTIONS,
  YES_NO_OPTIONS,
} from '@/config/quizContent';
import type { SavedQuizResult } from '@/types/quizResult';

function labelFromOptions<T extends string>(
  id: T,
  options: { id: T; label: string }[],
): string {
  return options.find((option) => option.id === id)?.label ?? id;
}

export function formatQuizCompletedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatSavedQuizSummary(saved: SavedQuizResult): {
  completedAt: string;
  age: string;
  spf: string;
  swelling: string;
  issues: string;
  tasks: string;
} {
  const { answers } = saved;

  return {
    completedAt: formatQuizCompletedAt(saved.completedAt),
    age: answers.skin_age
      ? AGE_OPTIONS.find((option) => option.id === answers.skin_age)?.label ?? answers.skin_age
      : '—',
    spf: answers.spf ? labelFromOptions(answers.spf, YES_NO_OPTIONS) : '—',
    swelling: answers.swelling ? labelFromOptions(answers.swelling, YES_NO_OPTIONS) : '—',
    issues: answers.skin_issues
      .map((issue) => labelFromOptions(issue, SKIN_ISSUE_OPTIONS))
      .join(', '),
    tasks: answers.skin_tasks
      .map((task) => labelFromOptions(task, SKIN_TASK_OPTIONS))
      .join(', '),
  };
}
