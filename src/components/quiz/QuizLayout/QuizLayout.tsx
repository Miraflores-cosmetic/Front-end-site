import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import goBackIcon from '@/assets/icons/go-back.svg';
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

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
          {children}
        </div>
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};
