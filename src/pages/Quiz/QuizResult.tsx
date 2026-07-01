import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { QuizResultPlayer } from '@/components/quiz/QuizResultPlayer/QuizResultPlayer';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { useQuizState } from '@/hooks/useQuizState';
import { buildFaceResult, isFaceQuizComplete, resolveFaceResultBlocks } from '@/lib/quiz';

const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { faceAnswers, resetQuiz } = useQuizState();
  const { content } = useQuizContent();

  const result = useMemo(() => {
    if (!isFaceQuizComplete(faceAnswers)) return null;
    return buildFaceResult(faceAnswers);
  }, [faceAnswers]);

  const resolvedBlocks = useMemo(() => {
    if (!result) return [];
    return resolveFaceResultBlocks(result, content);
  }, [result, content]);

  useEffect(() => {
    if (!isFaceQuizComplete(faceAnswers)) {
      navigate('/quiz/face', { replace: true });
    }
  }, [faceAnswers, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  if (!result) {
    return null;
  }

  const handleRestart = () => {
    resetQuiz();
    navigate('/quiz');
  };

  return (
    <QuizLayout showBack={false}>
      <QuizResultPlayer
        blocks={resolvedBlocks}
        content={content}
        onRestart={handleRestart}
      />
    </QuizLayout>
  );
};

export default QuizResultPage;
