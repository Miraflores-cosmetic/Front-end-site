export type QuizZone = 'face' | 'hair';

export type SkinAge = 'young' | 'mature';
export type Spf = 'yes' | 'no';
export type Swelling = 'yes' | 'no';

export type SkinIssue = 'comedones' | 'blackheads' | 'clear_skin';
export type SkinTask =
  | 'sensitivity'
  | 'dryness'
  | 'wrinkles'
  | 'post_acne'
  | 'dark_circles'
  | 'good_skin';

export interface FaceQuizAnswers {
  skin_age: SkinAge | null;
  spf: Spf | null;
  skin_issues: SkinIssue[];
  skin_tasks: SkinTask[];
  swelling: Swelling | null;
  selfie_count: number;
}

export const FACE_STEPS = ['age', 'spf', 'issues', 'tasks', 'swelling', 'photo'] as const;
export type FaceStep = (typeof FACE_STEPS)[number];

export const FACE_STEP_ROUTES: Record<FaceStep, string> = {
  age: '/quiz/face',
  spf: '/quiz/face/spf',
  issues: '/quiz/face/issues',
  tasks: '/quiz/face/tasks',
  swelling: '/quiz/face/swelling',
  photo: '/quiz/face/photo',
};

export const INITIAL_FACE_ANSWERS: FaceQuizAnswers = {
  skin_age: null,
  spf: null,
  skin_issues: [],
  skin_tasks: [],
  swelling: null,
  selfie_count: 0,
};
