import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { QuizZoneSelector } from '@/components/quiz/QuizZoneSelector/QuizZoneSelector';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { getQuizPlain } from '@/lib/quiz/contentUtils';
import { trackQuizEvent } from '@/lib/quiz/quizAnalytics';
import { useQuizState } from '@/hooks/useQuizState';
import type { QuizZone } from '@/types/quiz';
import styles from './Quiz.module.scss';

const QuizZonePage: React.FC = () => {
  const navigate = useNavigate();
  const { setZone } = useQuizState();
  const { content } = useQuizContent();

  useEffect(() => {
    trackQuizEvent({ type: 'quiz_start', once: true });
  }, []);

  const handleZoneSelect = (zone: QuizZone) => {
    setZone(zone);
    trackQuizEvent({
      type: 'zone_select',
      zone,
      stepKey: 'zone',
      meta: { zone },
    });
    navigate(zone === 'face' ? '/quiz/face' : '/quiz/hair');
  };

  return (
    <QuizLayout showBack onBack={() => navigate('/')}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className={styles.heading}>Подбор ухода</h1>
        <p className={styles.subheading}>
          Пройдите квиз и получите персональный подбор косметики по задачам вашей кожи и
          промокод для покупок!
        </p>
        <p className={styles.question}>{getQuizPlain(content, 'choose_care')}</p>
        <QuizZoneSelector onSelect={handleZoneSelect} />
      </motion.div>
    </QuizLayout>
  );
};

export default QuizZonePage;
