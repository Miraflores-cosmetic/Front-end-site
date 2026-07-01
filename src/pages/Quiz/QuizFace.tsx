import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { QuizStepper } from '@/components/quiz/QuizStepper/QuizStepper';
import { QuizOptionList } from '@/components/quiz/QuizOptionList/QuizOptionList';
import { QuizMultiSelect } from '@/components/quiz/QuizMultiSelect/QuizMultiSelect';
import { QuizPhotoUpload } from '@/components/quiz/QuizPhotoUpload/QuizPhotoUpload';
import {
  AGE_OPTIONS,
  YES_NO_OPTIONS,
  SKIN_ISSUE_OPTIONS,
  SKIN_TASK_OPTIONS,
} from '@/config/quizContent';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { getQuizPlain } from '@/lib/quiz/contentUtils';
import { useQuizState } from '@/hooks/useQuizState';
import {
  FACE_STEPS,
  FACE_STEP_ROUTES,
  type FaceStep,
  type SkinAge,
  type Spf,
  type Swelling,
  type SkinIssue,
  type SkinTask,
} from '@/types/quiz';
import styles from './Quiz.module.scss';

const PATH_TO_STEP: Record<string, FaceStep> = {
  '/quiz/face': 'age',
  '/quiz/face/spf': 'spf',
  '/quiz/face/issues': 'issues',
  '/quiz/face/tasks': 'tasks',
  '/quiz/face/swelling': 'swelling',
  '/quiz/face/photo': 'photo',
};

const STEP_INDEX: Record<FaceStep, number> = {
  age: 1,
  spf: 2,
  issues: 3,
  tasks: 4,
  swelling: 5,
  photo: 6,
};

function getNextRoute(step: FaceStep): string {
  const idx = FACE_STEPS.indexOf(step);
  if (idx < FACE_STEPS.length - 1) {
    return FACE_STEP_ROUTES[FACE_STEPS[idx + 1]];
  }
  return '/quiz/face/result';
}

function getPrevRoute(step: FaceStep): string {
  const idx = FACE_STEPS.indexOf(step);
  if (idx > 0) {
    return FACE_STEP_ROUTES[FACE_STEPS[idx - 1]];
  }
  return '/quiz';
}

const QuizFacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { faceAnswers, updateFace } = useQuizState();
  const { content } = useQuizContent();
  const [photos, setPhotos] = useState<File[]>([]);
  const [selectedAgeKey, setSelectedAgeKey] = useState<string | null>(null);

  const currentStep = PATH_TO_STEP[location.pathname] ?? 'age';
  const stepNumber = STEP_INDEX[currentStep];

  const questionText = useMemo(() => {
    const keyMap: Record<FaceStep, string> = {
      age: 'face_q_age',
      spf: 'face_q_spf',
      issues: 'face_q_skin',
      tasks: 'face_q_skin2',
      swelling: 'face_q_edema',
      photo: 'face_selfi',
    };
    return getQuizPlain(content, keyMap[currentStep]);
  }, [currentStep, content]);

  const handleAgeSelect = (key: string, id: SkinAge) => {
    setSelectedAgeKey(key);
    updateFace({ skin_age: id });
    navigate(getNextRoute('age'));
  };

  const handleSpfSelect = (id: Spf) => {
    updateFace({ spf: id });
    navigate(getNextRoute('spf'));
  };

  const handleSwellingSelect = (id: Swelling) => {
    updateFace({ swelling: id });
    navigate(getNextRoute('swelling'));
  };

  const handlePhotoNext = () => {
    updateFace({ selfie_count: photos.length });
    navigate('/quiz/face/result');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'age':
        return (
          <div className={styles.ageList}>
            {AGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.ageOption} ${selectedAgeKey === option.key ? styles.ageOptionSelected : ''}`}
                onClick={() => handleAgeSelect(option.key, option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'spf':
        return (
          <QuizOptionList
            options={YES_NO_OPTIONS}
            selected={faceAnswers.spf}
            onSelect={handleSpfSelect}
          />
        );

      case 'issues':
        return (
          <QuizMultiSelect<SkinIssue>
            options={SKIN_ISSUE_OPTIONS}
            selected={faceAnswers.skin_issues}
            onChange={(skin_issues) => updateFace({ skin_issues })}
            onConfirm={() => navigate(getNextRoute('issues'))}
          />
        );

      case 'tasks':
        return (
          <QuizMultiSelect<SkinTask>
            options={SKIN_TASK_OPTIONS}
            selected={faceAnswers.skin_tasks}
            onChange={(skin_tasks) => updateFace({ skin_tasks })}
            onConfirm={() => navigate(getNextRoute('tasks'))}
          />
        );

      case 'swelling':
        return (
          <QuizOptionList
            options={YES_NO_OPTIONS}
            selected={faceAnswers.swelling}
            onSelect={handleSwellingSelect}
          />
        );

      case 'photo':
        return (
          <QuizPhotoUpload
            photos={photos}
            onChange={setPhotos}
            onNext={handlePhotoNext}
          />
        );

      default:
        return null;
    }
  };

  return (
    <QuizLayout onBack={() => navigate(getPrevRoute(currentStep))}>
      <QuizStepper currentStep={stepNumber} totalSteps={6} />

      {currentStep === 'age' && (
        <p className={styles.contentBlock}>{getQuizPlain(content, 'menu_face_hello')}</p>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className={styles.question}>{questionText}</h2>
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {currentStep !== 'photo' && currentStep !== 'issues' && currentStep !== 'tasks' && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => navigate('/quiz')}
          >
            Выбрать другую зону
          </button>
        </div>
      )}
    </QuizLayout>
  );
};

export default QuizFacePage;
