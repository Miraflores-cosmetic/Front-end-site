import React from 'react';
import styles from './QuizStepper.module.scss';

interface QuizStepperProps {
  currentStep: number;
  totalSteps: number;
}

export const QuizStepper: React.FC<QuizStepperProps> = ({ currentStep, totalSteps }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={styles.stepper}>
      <div className={styles.label}>
        <span className={styles.stepNumber}>{currentStep}</span>
        <span className={styles.stepText}>
          Шаг {currentStep} из {totalSteps}
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};
