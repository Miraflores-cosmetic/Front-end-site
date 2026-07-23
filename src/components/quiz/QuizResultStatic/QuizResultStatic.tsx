import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button/Button';
import { QuizResultBlock } from '@/components/quiz/QuizResultBlock/QuizResultBlock';
import { getQuizPlain } from '@/lib/quiz/contentUtils';
import { splitResultBlocks } from '@/lib/quiz/resultPlayback';
import type { QuizContentMap, ResolvedContentBlock } from '@/types/quizContent';
import styles from './QuizResultStatic.module.scss';

interface QuizResultStaticProps {
  blocks: ResolvedContentBlock[];
  content: QuizContentMap;
  showActions?: boolean;
}

export const QuizResultStatic: React.FC<QuizResultStaticProps> = ({
  blocks,
  content,
  showActions = true,
}) => {
  const navigate = useNavigate();
  const { contentBlocks, endBlock } = splitResultBlocks(blocks);

  return (
    <div className={styles.static}>
      <ol className={styles.blockList}>
        {contentBlocks.map((block, index) => (
          <QuizResultBlock key={`${block.texts[0]?.key ?? index}-${index}`} block={block} />
        ))}
      </ol>

      {endBlock && (
        <div className={styles.footer}>
          <h1 className={styles.resultTitle}>
            {endBlock.texts[0]?.plain ?? getQuizPlain(content, 'end_face_care')}
          </h1>
          {showActions && (
            <div className={styles.actions}>
              <Button text="Перейти в каталог" onClick={() => navigate('/face')} />
              <button type="button" className={styles.secondaryLink} onClick={() => navigate('/quiz')}>
                Пройти заново
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
