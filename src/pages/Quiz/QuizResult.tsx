import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { Button } from '@/components/button/Button';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { QUIZ_CONTENT } from '@/config/quizContent';
import { useQuizState } from '@/hooks/useQuizState';
import styles from './Quiz.module.scss';

const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { faceAnswers, resetQuiz } = useQuizState();
  const [phase, setPhase] = React.useState<'loading' | 'ready'>('loading');

  useEffect(() => {
    const timer = setTimeout(() => setPhase('ready'), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (phase === 'loading') {
    return (
      <QuizLayout showBack={false}>
        <div className={styles.loaderBlock}>
          <SpinnerLoader />
          <p className={styles.loaderText}>{QUIZ_CONTENT.face_study}</p>
        </div>
      </QuizLayout>
    );
  }

  return (
    <QuizLayout
      showBack={false}
      onBack={() => navigate('/quiz/face/photo')}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={styles.resultPlaceholder}
      >
        <h1 className={styles.resultTitle}>{QUIZ_CONTENT.end_face_care}</h1>
        <p className={styles.resultText}>
          {QUIZ_CONTENT.face_steps} Рекомендации появятся здесь после подключения CMS и движка
          приоритетов.
        </p>

        <div className={styles.mediaPlaceholder}>Персональные рекомендации (медиа из CMS)</div>

        <p className={styles.contentBlock} style={{ textAlign: 'left', fontSize: 13 }}>
          Ваши ответы: возраст — {faceAnswers.skin_age ?? '—'}, SPF — {faceAnswers.spf ?? '—'},
          задачи — {faceAnswers.skin_tasks.join(', ') || '—'}
        </p>

        <div className={styles.actions}>
          <Button text="Перейти в каталог" onClick={() => navigate('/face')} />
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => {
              resetQuiz();
              navigate('/quiz');
            }}
          >
            Пройти заново
          </button>
        </div>
      </motion.div>
    </QuizLayout>
  );
};

export default QuizResultPage;
