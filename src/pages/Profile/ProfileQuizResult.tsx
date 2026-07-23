import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '@/components/Header/Header';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { QuizResultStatic } from '@/components/quiz/QuizResultStatic/QuizResultStatic';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { fetchSavedQuizResult } from '@/graphql/queries/quizResult.service';
import { buildFaceResult } from '@/lib/quiz/buildFaceResult';
import { resolveFaceResultBlocks } from '@/lib/quiz/resolveBlocks';
import type { SavedQuizResult } from '@/types/quizResult';
import styles from './ProfileQuizResult.module.scss';

const ProfileQuizResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { content, loading: contentLoading } = useQuizContent();
  const [saved, setSaved] = useState<SavedQuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      navigate('/sign-in');
      return;
    }

    fetchSavedQuizResult()
      .then((result) => {
        if (!result) {
          navigate('/profile?tab=quiz', { replace: true });
          return;
        }
        setSaved(result);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const resolvedBlocks = useMemo(() => {
    if (!saved) return [];
    const result = buildFaceResult(saved.answers);
    return resolveFaceResultBlocks(result, content);
  }, [saved, content]);

  if (loading || contentLoading) {
    return (
      <>
        <Header />
        <div className={styles.loaderWrap}>
          <SpinnerLoader />
        </div>
      </>
    );
  }

  if (!saved) {
    return null;
  }

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.container}>
          <Link to="/profile?tab=quiz" className={styles.backLink}>
            ← В личный кабинет
          </Link>
          <h1 className={styles.pageTitle}>Персональная программа ухода</h1>
          <QuizResultStatic blocks={resolvedBlocks} content={content} />
        </div>
      </main>
    </>
  );
};

export default ProfileQuizResultPage;
