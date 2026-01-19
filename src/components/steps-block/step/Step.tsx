import React from 'react';
import styles from './Step.module.scss';
interface StepProps {
  image: string;
  hoverImage?: string;
  title: string;
  description: string;
  etap: number;
  isActive?: boolean;
}

const Step: React.FC<StepProps> = ({ image, hoverImage, title, description, etap, isActive = false }) => {
  // Используем hoverImage если активен, иначе обычное изображение
  const displayImage = (isActive && hoverImage) ? hoverImage : image;
  const etapLabel = etap === 3 ? '3.0' : etap === 4 ? '3.1' : String(etap);

  return (
    <div className={`${styles.step} ${isActive ? styles.active : ''}`}>
      <div className={styles.stepWrapper}>
        <p className={styles.stepEtap}>Этап {etapLabel}</p>
        <img src={displayImage} alt={title} className={styles.stepImage} />
      </div>

      <div className={styles.textContent}>
        <h3 className={styles.textTitle}>{title}</h3>
        <p className={styles.textDesc}>{description}</p>
      </div>
    </div>
  );
};

export default Step;
