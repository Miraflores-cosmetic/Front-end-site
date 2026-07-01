import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCachedQuizContent, loadQuizContent } from '@/graphql/queries/quiz.service';
import type { QuizContentMap } from '@/types/quizContent';

interface QuizContentContextValue {
  content: QuizContentMap;
  loading: boolean;
  source: 'cms' | 'fallback' | 'mixed';
}

const QuizContentContext = createContext<QuizContentContextValue | null>(null);

export const QuizContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialCache = getCachedQuizContent();
  const [content, setContent] = useState<QuizContentMap>(initialCache?.content ?? {});
  const [loading, setLoading] = useState(!initialCache);
  const [source, setSource] = useState<'cms' | 'fallback' | 'mixed'>(
    initialCache?.source ?? 'fallback',
  );

  useEffect(() => {
    let active = true;

    loadQuizContent()
      .then((result) => {
        if (!active) return;
        setContent(result.content);
        setSource(result.source);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <QuizContentContext.Provider value={{ content, loading, source }}>
      {children}
    </QuizContentContext.Provider>
  );
};

export function useQuizContent(): QuizContentContextValue {
  const ctx = useContext(QuizContentContext);
  if (!ctx) {
    throw new Error('useQuizContent must be used within QuizContentProvider');
  }
  return ctx;
}
