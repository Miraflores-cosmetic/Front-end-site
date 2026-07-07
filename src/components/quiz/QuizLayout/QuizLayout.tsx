import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import goBackIcon from '@/assets/icons/go-back.svg';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import { useQuizContent } from '@/contexts/QuizContentContext';
import { scrollPageToTopAfterLayout } from '@/utils/scrollPageToTop';
import styles from './QuizLayout.module.scss';

interface QuizLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export const QuizLayout: React.FC<QuizLayoutProps> = ({
  children,
  onBack,
  showBack = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useQuizContent();

  useEffect(() => {
    scrollPageToTopAfterLayout();
  }, [location.pathname]);

  useEffect(() => {
    if (!loading) {
      scrollPageToTopAfterLayout();
    }
  }, [loading]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/quiz');
    }
  };

  return (
    <>
      <Header />
      <div className={styles.pageShell}>
        <main className={styles.page}>
          <div className={styles.container}>
            {showBack && (
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
                aria-label="Назад"
              >
                <img src={goBackIcon} alt="" aria-hidden />
                <span>Назад</span>
              </button>
            )}
            {loading ? (
              <div className={styles.loaderWrap}>
                <SpinnerLoader />
              </div>
            ) : (
              children
            )}
          </div>
          <Footer footerImage={footerImage} />
        </main>
      </div>
    </>
  );
};
