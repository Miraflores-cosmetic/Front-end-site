import type { ResolvedContentBlock } from '@/types/quizContent';

export const QUIZ_RESULT_TIMING = {
  /** Показ face_steps перед loader */
  introMs: 800,
  /** Loader «Изучаем ответы» */
  studyMs: 3000,
  /** После блока SPF */
  afterSpfMs: 3000,
  /** Между блоками рекомендаций */
  betweenBlocksMs: 4000,
  /** Перед блоком отёчности */
  beforeEdemaMs: 5000,
} as const;

const EDEMA_KEYS = new Set(['face_edema', 'face_edema2']);
const END_KEY = 'end_face_care';

export function isEdemaBlock(block: ResolvedContentBlock): boolean {
  return block.texts.some((t) => EDEMA_KEYS.has(t.key));
}

export function isEndBlock(block: ResolvedContentBlock): boolean {
  return block.texts.some((t) => t.key === END_KEY);
}

export function splitResultBlocks(blocks: ResolvedContentBlock[]): {
  contentBlocks: ResolvedContentBlock[];
  endBlock: ResolvedContentBlock | null;
} {
  const endIndex = blocks.findIndex(isEndBlock);
  if (endIndex === -1) {
    return { contentBlocks: blocks, endBlock: null };
  }
  return {
    contentBlocks: blocks.slice(0, endIndex),
    endBlock: blocks[endIndex],
  };
}

/** Задержка после показа блока `index` перед следующим. */
export function getDelayAfterBlock(
  contentBlocks: ResolvedContentBlock[],
  index: number,
): number {
  const next = contentBlocks[index + 1];
  if (!next) return 0;
  if (isEdemaBlock(next)) return QUIZ_RESULT_TIMING.beforeEdemaMs;
  if (index === 0) return QUIZ_RESULT_TIMING.afterSpfMs;
  return QUIZ_RESULT_TIMING.betweenBlocksMs;
}

export type ResultPlayerPhase = 'intro' | 'studying' | 'playing' | 'finished';
