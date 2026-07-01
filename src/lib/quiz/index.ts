export { buildFaceResult, isFaceQuizComplete } from './buildFaceResult';
export type { ContentBlock, CompleteFaceQuizAnswers, FaceResultMeta } from './buildFaceResult';
export { getPriorityIndex, SKIN_TASK_PRIORITIES } from './priorities';
export { getRecommendationEntry, RECOMMENDATION_MATRIX } from './recommendationMatrix';
export { resolveFaceResultBlocks } from './resolveBlocks';
export {
  getDelayAfterBlock,
  isEdemaBlock,
  isEndBlock,
  splitResultBlocks,
  QUIZ_RESULT_TIMING,
} from './resultPlayback';
export type { ResultPlayerPhase } from './resultPlayback';
export {
  attributeSlugToContentKey,
  getQuizHtml,
  getQuizPlain,
  getQuizMedia,
  mergeQuizContent,
} from './contentUtils';
