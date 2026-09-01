import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/button/Button';
import { fetchSavedQuizResult } from '@/services/quizResult.service';
import { formatSavedQuizSummary } from '@/lib/quiz/formatQuizAnswersSummary';
import type { SavedQuizResult } from '@/types/quizResult';
import { TabId } from '@/pages/Profile/side-bar/SideBar';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import {
  ProfileEmptyState,
  ProfileLoadingState,
  ProfileSection,
} from '@/pages/Profile/components/ProfileSection';
import styles from './QuizCareContent.module.scss';

interface QuizCareContentProps {
  setOpenAccordion?: React.Dispatch<React.SetStateAction<TabId | null>>;
}

const QuizCareContent: React.FC<QuizCareContentProps> = ({ setOpenAccordion }) => {
  const navigate = useNavigate();
  const isMobile = useScreenMatch();
  const [saved, setSaved] = useState<SavedQuizResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    const result = await fetchSavedQuizResult();
    setSaved(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    const onUpdated = () => {
      void loadSaved();
    };
    window.addEventListener('quizResultUpdated', onUpdated);
    return () => window.removeEventListener('quizResultUpdated', onUpdated);
  }, [loadSaved]);

  if (loading) {
    return (
      <ProfileSection
        title="Мой уход"
        isMobile={isMobile}
        onClose={setOpenAccordion ? () => setOpenAccordion(null) : undefined}
        className={styles.careContent}
      >
        <ProfileLoadingState message="Загрузка программы ухода..." />
      </ProfileSection>
    );
  }

  if (!saved) {
    return (
      <ProfileSection
        title="Мой уход"
        isMobile={isMobile}
        onClose={setOpenAccordion ? () => setOpenAccordion(null) : undefined}
        className={styles.careContent}
      >
        <ProfileEmptyState
          message="Вы ещё не проходили подбор ухода или результат не был сохранён в аккаунт."
          actionLabel="Пройти подбор ухода"
          onAction={() => navigate('/quiz')}
        />
      </ProfileSection>
    );
  }

  const summary = formatSavedQuizSummary(saved);

  return (
    <ProfileSection
      title="Мой уход"
      isMobile={isMobile}
      onClose={setOpenAccordion ? () => setOpenAccordion(null) : undefined}
      className={styles.careContent}
    >
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
        {summary.issues ? (
          <div className={styles.row}>
            <dt>Проблемы кожи</dt>
            <dd>{summary.issues}</dd>
          </div>
        ) : null}
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
    </ProfileSection>
  );
};

export default QuizCareContent;
