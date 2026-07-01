import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { QuizRichText } from '@/components/quiz/QuizRichText/QuizRichText';
import { QuizMedia } from '@/components/quiz/QuizMedia/QuizMedia';
import { Button } from '@/components/button/Button';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { getQuizHtml, getQuizMedia } from '@/lib/quiz/contentUtils';
import { useQuizState } from '@/hooks/useQuizState';
import styles from './Quiz.module.scss';

type HairStep = 'cleansing' | 'care' | 'loading' | 'media1' | 'media2';

const HAIR_STEPS: HairStep[] = ['cleansing', 'care', 'loading', 'media1', 'media2'];

const QuizHairPage: React.FC = () => {
  const navigate = useNavigate();
  const { setZone } = useQuizState();
  const { content } = useQuizContent();
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = HAIR_STEPS[stepIndex];

  useEffect(() => {
    setZone('hair');
  }, [setZone]);

  useEffect(() => {
    if (currentStep !== 'loading') return;

    const timer = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleNext = () => {
    if (stepIndex < HAIR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    } else {
      navigate('/quiz');
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'cleansing': {
        const html = getQuizHtml(content, 'hair_cleansing');
        return (
          <>
            {html && <QuizRichText html={html} className={styles.contentBlock} />}
            <Button text="Далее" onClick={handleNext} />
          </>
        );
      }

      case 'care': {
        const html = getQuizHtml(content, 'hair_care');
        return (
          <>
            {html && <QuizRichText html={html} className={styles.contentBlock} />}
            <div className={styles.actions}>
              <Button text="Далее" onClick={handleNext} />
              <button
                type="button"
                className={styles.secondaryLink}
                onClick={() => navigate('/quiz')}
              >
                Выбрать другую зону
              </button>
            </div>
          </>
        );
      }

      case 'loading':
        return (
          <div className={styles.loaderBlock}>
            <SpinnerLoader />
            <p className={styles.loaderText}>Подбираем уход…</p>
          </div>
        );

      case 'media1':
      case 'media2': {
        const mediaKey = currentStep === 'media1' ? 'file_1' : 'file_1.1';
        const media = getQuizMedia(content, mediaKey);
        return (
          <>
            {media?.mediaUrl && media.mediaType ? (
              <QuizMedia
                url={media.mediaUrl}
                mediaType={media.mediaType}
                title={`Рекомендация ${currentStep === 'media1' ? '1' : '2'}`}
              />
            ) : (
              <div className={styles.mediaPlaceholder}>
                Медиа «{mediaKey}» — добавьте в CMS
              </div>
            )}
            <div className={styles.actions}>
              {currentStep === 'media2' ? (
                <>
                  <Button text="Перейти в каталог" onClick={() => navigate('/catalog/')} />
                  <button
                    type="button"
                    className={styles.secondaryLink}
                    onClick={() => navigate('/quiz')}
                  >
                    Пройти заново
                  </button>
                </>
              ) : (
                <Button text="Далее" onClick={handleNext} />
              )}
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <QuizLayout onBack={handleBack}>
      <h1 className={styles.heading}>Уход за волосами</h1>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </QuizLayout>
  );
};

export default QuizHairPage;
