import type { SkinAge } from '@/types/quiz';

export interface RecommendationEntry {
  texts: string[];
  media: string[];
}

/** Матрица контента §6.2: skin_age × priority → ключи CMS. */
export const RECOMMENDATION_MATRIX: Record<
  SkinAge,
  Record<number, RecommendationEntry>
> = {
  young: {
    1: { texts: ['other_steps_1'], media: ['file_4', 'file_4.1'] },
    2: { texts: ['other_steps_2'], media: ['file_5', 'file_5.1'] },
    3: { texts: ['other_steps_3'], media: ['file_6', 'file_6.1'] },
    4: { texts: ['other_steps_4'], media: ['file_7', 'file_7.1'] },
  },
  mature: {
    1: { texts: ['other_steps_5'], media: ['file_8'] },
    2: { texts: ['other_steps_6'], media: ['file_9', 'file_9.1'] },
    3: { texts: ['other_steps_7'], media: ['file_10', 'file_10.1'] },
    4: { texts: ['other_steps_8_1', 'other_steps_8_2'], media: ['file_11', 'file_12'] },
  },
};

export function getRecommendationEntry(
  skinAge: SkinAge,
  priority: number,
): RecommendationEntry | null {
  return RECOMMENDATION_MATRIX[skinAge][priority] ?? null;
}
