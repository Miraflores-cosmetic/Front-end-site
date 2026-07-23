import type { CompleteFaceQuizAnswers } from '@/lib/quiz/buildFaceResult';

export interface SavedQuizResultMeta {
  priority: number | null;
  blockKeys: string[];
}

export interface SavedQuizResult {
  version: 1;
  zone: 'face';
  completedAt: string;
  answers: CompleteFaceQuizAnswers;
  result: SavedQuizResultMeta;
}

export interface SavedQuizResultResponse {
  result: SavedQuizResult | null;
}
