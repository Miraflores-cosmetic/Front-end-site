import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { QuizLayout } from '@/components/quiz/QuizLayout/QuizLayout';
import { QuizResultPlayer } from '@/components/quiz/QuizResultPlayer/QuizResultPlayer';
import { QuizResultStatic } from '@/components/quiz/QuizResultStatic/QuizResultStatic';
import { Button } from '@/components/button/Button';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { useQuizState } from '@/hooks/useQuizState';
import { buildFaceResult, isFaceQuizComplete, resolveFaceResultBlocks } from '@/lib/quiz';
import type { CompleteFaceQuizAnswers } from '@/lib/quiz/buildFaceResult';
import { buildSavedQuizPayload } from '@/lib/quiz/savedQuizResult';
import {
  fetchSavedQuizResult,
  saveQuizResult,
  setAuthReturnUrl,
} from '@/graphql/queries/quizResult.service';
import { scrollPageToTopAfterLayout } from '@/utils/scrollPageToTop';
import { useToast } from '@/components/toast/toast';
import type { SavedQuizResult } from '@/types/quizResult';
import type { RootState } from '@/store/store';
import styles from './Quiz.module.scss';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ResultSource = 'loading' | 'session' | 'recovered' | 'missing';

const QuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { faceAnswers, resetQuiz } = useQuizState();
  const { content, loading: contentLoading } = useQuizContent();
  const { isAuth } = useSelector((state: RootState) => state.authSlice);
  const savedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [resultSource, setResultSource] = useState<ResultSource>(() =>
    isFaceQuizComplete(faceAnswers) ? 'session' : 'loading',
  );
  const [recoveredSaved, setRecoveredSaved] = useState<SavedQuizResult | null>(null);

  const quizComplete = isFaceQuizComplete(faceAnswers);

  const result = useMemo(() => {
    if (!quizComplete) return null;
    return buildFaceResult(faceAnswers);
  }, [faceAnswers, quizComplete]);

  const resolvedBlocks = useMemo(() => {
    if (!result) return [];
    return resolveFaceResultBlocks(result, content);
  }, [result, content]);

  const recoveredBlocks = useMemo(() => {
    if (!recoveredSaved) return [];
    const built = buildFaceResult(recoveredSaved.answers);
    return resolveFaceResultBlocks(built, content);
  }, [recoveredSaved, content]);

  useEffect(() => {
    if (quizComplete) {
      setResultSource('session');
      return;
    }

    let cancelled = false;
    setResultSource('loading');

    const finishMissing = () => {
      if (!cancelled) {
        setResultSource('missing');
      }
    };

    if (isAuth) {
      fetchSavedQuizResult()
        .then((saved) => {
          if (cancelled) return;
          if (saved) {
            setRecoveredSaved(saved);
            setResultSource('recovered');
            setSaveStatus('saved');
            savedRef.current = true;
            return;
          }
          finishMissing();
        })
        .catch(() => finishMissing());
    } else {
      finishMissing();
    }

    return () => {
      cancelled = true;
    };
  }, [quizComplete, isAuth]);

  const trySaveResult = useCallback(async (force = false) => {
    if (!isAuth || !result) return;
    if (!force && savedRef.current) return;

    setSaveStatus('saving');

    const outcome = await saveQuizResult(
      buildSavedQuizPayload(
        faceAnswers as CompleteFaceQuizAnswers,
        result,
      ),
    );

    if (outcome.ok) {
      savedRef.current = true;
      setSaveStatus('saved');
      window.dispatchEvent(new Event('quizResultUpdated'));
      return;
    }

    savedRef.current = false;
    setSaveStatus('error');
    toast.error(outcome.error);
  }, [isAuth, result, faceAnswers, toast]);

  useEffect(() => {
    scrollPageToTopAfterLayout();
  }, []);

  useEffect(() => {
    if (isAuth && result && resultSource === 'session') {
      void trySaveResult();
    }
  }, [isAuth, result, resultSource, trySaveResult]);

  const handleLoginRequest = () => {
    setAuthReturnUrl('/quiz/face/result');
    navigate('/sign-in');
  };

  const handleSignUpRequest = () => {
    setAuthReturnUrl('/quiz/face/result');
    navigate('/sign-up');
  };

  const handleRestart = () => {
    resetQuiz();
    navigate('/quiz');
  };

  if (resultSource === 'loading' || contentLoading) {
    return (
      <QuizLayout showBack={false}>
        {null}
      </QuizLayout>
    );
  }

  if (resultSource === 'missing') {
    return (
      <QuizLayout showBack={false}>
        <div className={styles.resultFallback}>
          <h1 className={styles.heading}>Результат не найден</h1>
          <p className={styles.subheading}>
            Ответы квиза недоступны в этой вкладке. Пройдите подбор ухода заново или откройте
            сохранённую программу в личном кабинете.
          </p>
          <div className={styles.resultFallbackActions}>
            <Button text="Пройти квиз заново" onClick={handleRestart} />
            {isAuth && (
              <button type="button" className={styles.secondaryLink} onClick={() => navigate('/profile?tab=quiz')}>
                Открыть личный кабинет
              </button>
            )}
            {!isAuth && (
              <button type="button" className={styles.secondaryLink} onClick={handleLoginRequest}>
                Войти и сохранить
              </button>
            )}
          </div>
        </div>
      </QuizLayout>
    );
  }

  if (resultSource === 'recovered' && recoveredSaved) {
    return (
      <QuizLayout showBack={false}>
        <div className={styles.resultFallbackNotice}>
          Программа загружена из личного кабинета — ответы квиза в этой вкладке недоступны.
        </div>
        <QuizResultStatic blocks={recoveredBlocks} content={content} />
      </QuizLayout>
    );
  }

  if (!result) {
    return (
      <QuizLayout showBack={false}>
        {null}
      </QuizLayout>
    );
  }

  return (
    <QuizLayout showBack={false}>
      <QuizResultPlayer
        blocks={resolvedBlocks}
        content={content}
        onRestart={handleRestart}
        onFinished={() => {
          void trySaveResult();
        }}
        isAuthenticated={isAuth}
        onLoginRequest={handleLoginRequest}
        onSignUpRequest={handleSignUpRequest}
        saveStatus={saveStatus}
        onRetrySave={() => {
          void trySaveResult(true);
        }}
      />
    </QuizLayout>
  );
};

export default QuizResultPage;
