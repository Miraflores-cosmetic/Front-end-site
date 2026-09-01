import { describe, expect, it } from 'vitest';
import { getQuizHtml } from './contentUtils';
import type { QuizContentMap } from '@/types/quizContent';

describe('getQuizHtml', () => {
  it('wraps plain text when html is empty', () => {
    const content: QuizContentMap = {
      step_1_spf: {
        plain: 'Текст только в plain',
        html: null,
        mediaUrl: null,
        mediaType: null,
      },
    };

    expect(getQuizHtml(content, 'step_1_spf')).toBe('<p>Текст только в plain</p>');
  });

  it('prefers html over plain', () => {
    const content: QuizContentMap = {
      step_1_spf: {
        plain: 'plain',
        html: '<p>html</p>',
        mediaUrl: null,
        mediaType: null,
      },
    };

    expect(getQuizHtml(content, 'step_1_spf')).toBe('<p>html</p>');
  });
});
