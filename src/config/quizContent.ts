import type { SkinAge, SkinIssue, SkinTask } from '@/types/quiz';

/** Slug страницы в Saleor CMS (Page → podbor-uhoda). */
export const QUIZ_PAGE_SLUG =
  import.meta.env.VITE_QUIZ_PAGE_SLUG || 'podbor-uhoda';

/** Текстовые ключи с локальными fallback-значениями. */
export const QUIZ_TEXT_FALLBACKS: Record<string, string> = {
  greeting:
    'Добро пожаловать в персональный подбор ухода Miraflores! Ответьте на несколько вопросов — и мы подберём рекомендации специально для вас.',
  choose_care: 'Что вас интересует?',
  menu_face_hello:
    'Отлично! Сейчас мы зададим несколько вопросов о вашей коже, чтобы подобрать идеальный уход.',
  face_q_age: 'Сколько вам лет?',
  face_q_spf: 'Используете ли вы SPF-крем ежедневно?',
  face_q_skin: 'Какие проблемы с кожей вас беспокоят?',
  face_q_skin2: 'Какие задачи ухода для вас актуальны?',
  face_q_edema: 'Беспокоит ли вас отёчность лица по утрам?',
  face_selfi:
    'При желании загрузите фото кожи (до 3 штук). Это поможет нам лучше понять ваши потребности. Фото не влияет на алгоритм подбора.',
  hair_cleansing:
    'Правильное очищение — основа здоровых волос. Начните с мягкого шампуня без агрессивных ПАВ, подходящего вашему типу волос.',
  hair_care:
    'После очищения важно питание и увлажнение. Маски и кондиционеры с натуральными маслами восстанавливают структуру волос.',
  face_steps: 'Подбираем ваш персональный уход…',
  face_study: 'Изучаем ваши ответы',
  end_face_care: 'Ваш персональный уход готов!',
};

/**
 * Тексты блоков результата (§3.1, §6.2).
 * Заполните из Telegram-бота или через CMS (атрибуты step_1_spf, other_steps_1…).
 */
export const QUIZ_RESULT_TEXT_FALLBACKS: Record<string, string> = {
  step_1_spf: '',
  step_1_nospf: '',
  no_answers: '',
  other_steps_1: '',
  other_steps_2: '',
  other_steps_3: '',
  other_steps_4: '',
  other_steps_5: '',
  other_steps_6: '',
  other_steps_7: '',
  other_steps_8_1: '',
  other_steps_8_2: '',
  face_edema: '',
  face_edema2: '',
};

/** Все текстовые fallback-значения (UI + результат). */
export const QUIZ_ALL_TEXT_FALLBACKS: Record<string, string> = {
  ...QUIZ_TEXT_FALLBACKS,
  ...QUIZ_RESULT_TEXT_FALLBACKS,
};

/** @deprecated Используйте useQuizContent(). Сохранено для обратной совместимости. */
export const QUIZ_CONTENT = QUIZ_TEXT_FALLBACKS;

export const QUIZ_MEDIA_KEYS = [
  'file_1',
  'file_1.1',
  'file_2',
  'file_3',
  'file_4',
  'file_4.1',
  'file_5',
  'file_5.1',
  'file_6',
  'file_6.1',
  'file_7',
  'file_7.1',
  'file_8',
  'file_9',
  'file_9.1',
  'file_10',
  'file_10.1',
  'file_11',
  'file_12',
] as const;

export const QUIZ_RESULT_TEXT_KEYS = [
  'step_1_spf',
  'step_1_nospf',
  'no_answers',
  'other_steps_1',
  'other_steps_2',
  'other_steps_3',
  'other_steps_4',
  'other_steps_5',
  'other_steps_6',
  'other_steps_7',
  'other_steps_8_1',
  'other_steps_8_2',
  'face_edema',
  'face_edema2',
] as const;

export const QUIZ_ALL_CONTENT_KEYS = [
  ...Object.keys(QUIZ_TEXT_FALLBACKS),
  ...QUIZ_RESULT_TEXT_KEYS,
  ...QUIZ_MEDIA_KEYS,
];

export const AGE_OPTIONS: { key: string; id: SkinAge; label: string }[] = [
  { key: 'under25', id: 'young', label: 'моложе 25' },
  { key: '25-40', id: 'young', label: '25–40' },
  { key: '40-50', id: 'mature', label: '40–50' },
  { key: '50+', id: 'mature', label: '50+' },
];

export const YES_NO_OPTIONS = [
  { id: 'yes' as const, label: 'Да' },
  { id: 'no' as const, label: 'Нет' },
];

export const SKIN_ISSUE_OPTIONS: { id: SkinIssue; label: string }[] = [
  { id: 'comedones', label: 'Комедоны и воспаления' },
  { id: 'blackheads', label: 'Черные точки' },
  { id: 'clear_skin', label: 'Нет, у меня чистая кожа' },
];

export const SKIN_TASK_OPTIONS: { id: SkinTask; label: string }[] = [
  { id: 'sensitivity', label: 'Высокая чувствительность' },
  { id: 'dryness', label: 'Сухость, чувство стянутости после умывания' },
  { id: 'wrinkles', label: 'Морщинки и возрастные изменения' },
  { id: 'post_acne', label: 'Следы постакне, пигментные пятна' },
  { id: 'dark_circles', label: 'Синяки под глазами' },
  { id: 'good_skin', label: 'У меня достаточно хорошая кожа, хочу качественные составы' },
];
