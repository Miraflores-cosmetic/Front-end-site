import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button/Button';
import { fetchSavedQuizResult } from '@/graphql/queries/quizResult.service';
import { formatSavedQuizSummary } from '@/lib/quiz/formatQuizAnswersSummary';
import type { SavedQuizResult } from '@/types/quizResult';
import styles from './QuizCareContent.module.scss';

const QuizCareContent: React.FC = () => {
  const navigate = useNavigate();
  const [saved, setSaved] = useState<SavedQuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    const result = await fetchSavedQuizResult();
    setSaved(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const onUpdated = () => {
      loadSaved();
    };
    window.addEventListener('quizResultUpdated', onUpdated);
    return () => window.removeEventListener('quizResultUpdated', onUpdated);
  }, [loadSaved]);

  if (loading) {
    return <div className={styles.loading}>Загрузка программы ухода...</div>;
  }

  if (!saved) {
    return (
      <article className={styles.careContent}>
        <p className={styles.title}>Мой уход</p>
        <p className={styles.empty}>
          Вы ещё не проходили подбор ухода или результат не был сохранён в аккаунт.
        </p>
        <Button text="Пройти подбор ухода" onClick={() => navigate('/quiz')} />
      </article>
    );
  }

  const summary = formatSavedQuizSummary(saved);

  return (
    <article className={styles.careContent}>
      <p className={styles.title}>Мой уход</p>
      <p className={styles.date}>Обновлено: {summary.completedAt}</p>

      <dl className={styles.summary}>
        <div className={styles.row}>
          <dt>Возраст</dt>
          <dd>{summary.age}</dd>
        </div>
        <div className={styles.row}>
          <dt>SPF ежедневно</dt>
          <dd>{summary.spf}</dd>
        </div>
        {summary.issues && (
          <div className={styles.row}>
            <dt>Проблемы кожи</dt>
            <dd>{summary.issues}</dd>
          </div>
        )}
        <div className={styles.row}>
          <dt>Задачи ухода</dt>
          <dd>{summary.tasks}</dd>
        </div>
        <div className={styles.row}>
          <dt>Отёчность</dt>
          <dd>{summary.swelling}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Button text="Открыть программу" onClick={() => navigate('/profile/quiz-result')} />
        <button type="button" className={styles.secondaryLink} onClick={() => navigate('/quiz')}>
          Пройти заново
        </button>
      </div>
    </article>
  );
};

export default QuizCareContent;
