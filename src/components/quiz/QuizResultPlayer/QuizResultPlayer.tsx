import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/button/Button';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { QuizResultBlock } from '@/components/quiz/QuizResultBlock/QuizResultBlock';
import { getQuizPlain } from '@/lib/quiz/contentUtils';
import {
  getDelayAfterBlock,
  QUIZ_RESULT_TIMING,
  splitResultBlocks,
  type ResultPlayerPhase,
} from '@/lib/quiz/resultPlayback';
import type { QuizContentMap, ResolvedContentBlock } from '@/types/quizContent';
import styles from './QuizResultPlayer.module.scss';

interface QuizResultPlayerProps {
  blocks: ResolvedContentBlock[];
  content: QuizContentMap;
  onRestart: () => void;
}

export const QuizResultPlayer: React.FC<QuizResultPlayerProps> = ({
  blocks,
  content,
  onRestart,
}) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ResultPlayerPhase>('intro');
  const [revealedCount, setRevealedCount] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const { contentBlocks, endBlock } = useMemo(() => splitResultBlocks(blocks), [blocks]);

  const visibleBlocks = contentBlocks.slice(0, revealedCount);
  const isComplete = phase === 'finished';

  // face_steps → face_study (loader)
  useEffect(() => {
    if (phase !== 'intro') return;
    const timer = setTimeout(() => setPhase('studying'), QUIZ_RESULT_TIMING.introMs);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'studying') return;
    const timer = setTimeout(() => setPhase('playing'), QUIZ_RESULT_TIMING.studyMs);
    return () => clearTimeout(timer);
  }, [phase]);

  // Поэтапный показ блоков рекомендаций
  useEffect(() => {
    if (phase !== 'playing') return;

    if (revealedCount >= contentBlocks.length) {
      setPhase('finished');
      return;
    }

    const delay =
      revealedCount === 0 ? 0 : getDelayAfterBlock(contentBlocks, revealedCount - 1);

    const timer = setTimeout(() => {
      setRevealedCount((count) => count + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [phase, revealedCount, contentBlocks]);

  // Прокрутка к новому блоку (не при первом показе — страница остаётся сверху)
  useEffect(() => {
    if (revealedCount <= 1 || !listRef.current) return;
    const lastItem = listRef.current.lastElementChild;
    lastItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [revealedCount]);

  return (
    <div className={styles.player}>
      <AnimatePresence mode="wait">
        {phase === 'intro' && (
          <motion.p
            key="intro"
            className={styles.introText}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {getQuizPlain(content, 'face_steps')}
          </motion.p>
        )}

        {phase === 'studying' && (
          <motion.div
            key="studying"
            className={styles.loaderBlock}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SpinnerLoader />
            <p className={styles.loaderText}>{getQuizPlain(content, 'face_study')}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {(phase === 'playing' || phase === 'finished') && (
        <motion.div
          className={styles.results}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {visibleBlocks.length > 0 && (
            <ol ref={listRef} className={styles.blockList}>
              <AnimatePresence initial={false}>
                {visibleBlocks.map((block, index) => (
                  <QuizResultBlock key={`${block.texts[0]?.key ?? index}-${index}`} block={block} />
                ))}
              </AnimatePresence>
            </ol>
          )}

          {phase === 'playing' && revealedCount < contentBlocks.length && (
            <div className={styles.pendingLoader} aria-hidden>
              <span className={styles.pendingDot} />
              <span className={styles.pendingDot} />
              <span className={styles.pendingDot} />
            </div>
          )}

          <AnimatePresence>
            {isComplete && (
              <motion.div
                key="cta"
                className={styles.footer}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <h1 className={styles.resultTitle}>
                  {endBlock?.texts[0]?.plain ?? getQuizPlain(content, 'end_face_care')}
                </h1>

                <div className={styles.actions}>
                  <Button text="Перейти в каталог" onClick={() => navigate('/face')} />
                  <button type="button" className={styles.secondaryLink} onClick={onRestart}>
                    Пройти заново
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
};
