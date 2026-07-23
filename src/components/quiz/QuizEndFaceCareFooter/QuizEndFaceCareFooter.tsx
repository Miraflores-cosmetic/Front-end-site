import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button/Button';
import { QuizRichText } from '@/components/quiz/QuizRichText/QuizRichText';
import { getQuizHtml, getQuizPlain } from '@/lib/quiz/contentUtils';
import {
  hasNaboryCategoryLink,
  stripNaboryLinkFromHtml,
  stripNaboryLinkFromPlain,
} from '@/lib/quiz/parseEndFaceCare';
import type { QuizContentMap, ResolvedTextBlock } from '@/types/quizContent';
import styles from './QuizEndFaceCareFooter.module.scss';

interface QuizEndFaceCareFooterProps {
  textBlock?: ResolvedTextBlock | null;
  content: QuizContentMap;
}

export const QuizEndFaceCareFooter: React.FC<QuizEndFaceCareFooterProps> = ({
  textBlock,
  content,
}) => {
  const navigate = useNavigate();
  const html = textBlock?.html ?? getQuizHtml(content, 'end_face_care') ?? '';
  const plain = textBlock?.plain ?? getQuizPlain(content, 'end_face_care');
  const combined = `${plain}\n${html}`;
  const showNaboryButton = hasNaboryCategoryLink(combined);
  const bodyHtml = html ? stripNaboryLinkFromHtml(html) : '';
  const bodyPlain = stripNaboryLinkFromPlain(plain);

  return (
    <div className={styles.endFaceCare}>
      {bodyHtml ? (
        <QuizRichText html={bodyHtml} className={styles.endBody} />
      ) : (
        bodyPlain && <p className={styles.endBody}>{bodyPlain}</p>
      )}

      {showNaboryButton && (
        <div className={styles.naboryButton}>
          <Button text="Смотреть наборы" onClick={() => navigate('/category/nabory')} />
        </div>
      )}
    </div>
  );
};
