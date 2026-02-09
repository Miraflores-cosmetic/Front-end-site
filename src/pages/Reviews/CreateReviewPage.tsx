import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ReviewModal } from '@/components/review-modal/ReviewModal';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footer-img.png';
import styles from './CreateReviewPage.module.scss';

const CreateReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [productId, setProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState<string>('Товар');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Получаем productId из query параметров
    const id = searchParams.get('productId');
    const name = searchParams.get('productName') || 'Товар';
    
    if (id) {
      setProductId(id);
      setProductName(name);
      // Открываем модалку сразу после установки productId
      setIsModalOpen(true);
    } else {
      // Если нет productId, редиректим на страницу отзывов
      navigate('/reviews');
    }
  }, [searchParams, navigate]);

  const handleClose = () => {
    setIsModalOpen(false);
    // Небольшая задержка перед редиректом, чтобы модалка успела закрыться
    setTimeout(() => {
      navigate('/reviews');
    }, 300);
  };

  if (!productId) {
    return (
      <>
        <Header />
        <main className={styles.container}>
          <p>Загрузка...</p>
        </main>
        <Footer footerImage={footerImage} />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.container}>
        {isModalOpen && (
          <ReviewModal
            isOpen={isModalOpen}
            onClose={handleClose}
            productId={productId}
            productName={productName}
          />
        )}
      </main>
      <Footer footerImage={footerImage} />
    </>
  );
};

export default CreateReviewPage;
