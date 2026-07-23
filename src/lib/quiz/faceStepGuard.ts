import {
  FACE_STEP_ROUTES,
  FACE_STEPS,
  type FaceQuizAnswers,
  type FaceStep,
} from '@/types/quiz';

/** Первый шаг, на котором пользователь должен продолжить квиз. */
export function getFirstAllowedFaceStep(answers: FaceQuizAnswers): FaceStep {
  if (answers.skin_age === null) return 'age';
  if (answers.spf === null) return 'spf';
  if (answers.skin_tasks.length === 0) return 'tasks';
  if (answers.swelling === null) return 'swelling';
  return 'photo';
}

/** Redirect URL, если deep-link ведёт дальше, чем позволяют ответы. */
export function getFaceStepGuardRedirect(
  currentStep: FaceStep,
  answers: FaceQuizAnswers,
): string | null {
  const allowedStep = getFirstAllowedFaceStep(answers);
  const currentIdx = FACE_STEPS.indexOf(currentStep);
  const allowedIdx = FACE_STEPS.indexOf(allowedStep);

  if (currentIdx <= allowedIdx) return null;
  return FACE_STEP_ROUTES[allowedStep];
}
