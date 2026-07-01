import type { FaceQuizAnswers, SkinAge, Spf, Swelling, SkinTask } from '@/types/quiz';
import { getPriorityIndex } from './priorities';
import { getRecommendationEntry } from './recommendationMatrix';

export interface ContentBlock {
  texts: string[];
  media: string[];
}

export interface CompleteFaceQuizAnswers {
  skin_age: SkinAge;
  spf: Spf;
  skin_issues: FaceQuizAnswers['skin_issues'];
  skin_tasks: SkinTask[];
  swelling: Swelling;
  selfie_count: number;
}

export interface FaceResultMeta {
  priority: number | null;
  blocks: ContentBlock[];
}

export function isFaceQuizComplete(answers: FaceQuizAnswers): answers is CompleteFaceQuizAnswers {
  return (
    answers.skin_age !== null &&
    answers.spf !== null &&
    answers.swelling !== null &&
    answers.skin_tasks.length > 0
  );
}

function getEdemaTextKey(_skinAge: SkinAge, priority: number): string {
  return priority === 1 ? 'face_edema' : 'face_edema2';
}

/**
 * Строит упорядоченный список блоков результата по ответам квиза (§6.3).
 */
export function buildFaceResult(answers: CompleteFaceQuizAnswers): FaceResultMeta {
  const blocks: ContentBlock[] = [];

  // Шаг 1 — SPF
  blocks.push(
    answers.spf === 'yes'
      ? { texts: ['step_1_spf'], media: ['file_2'] }
      : { texts: ['step_1_nospf'], media: ['file_3'] },
  );

  const priority = getPriorityIndex(answers.skin_tasks);
  if (!priority) {
    blocks.push({ texts: ['no_answers'], media: [] });
    return { priority: null, blocks };
  }

  const recommendation = getRecommendationEntry(answers.skin_age, priority);
  if (recommendation) {
    blocks.push(recommendation);
  }

  if (answers.swelling === 'yes') {
    blocks.push({ texts: [getEdemaTextKey(answers.skin_age, priority)], media: [] });
  }

  blocks.push({ texts: ['end_face_care'], media: [] });

  return { priority, blocks };
}
