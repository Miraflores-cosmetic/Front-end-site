import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Step.module.scss';

interface StepProps {
  image: string;
  title: string;
  description: string;
  etap: number;
  href: string;
  isActive?: boolean;
}

function etapLabel(etap: number): string {
  if (etap === 3) return '3.0';
  if (etap === 4) return '3.1';
  return String(etap);
}

const Step: React.FC<StepProps> = ({
  image,
  title,
  description,
  etap,
  href,
  isActive = false,
}) => {
  const desc = description?.trim();

  return (
    <Link
      to={href}
      className={`${styles.step} ${isActive ? styles.active : ''}`}
      aria-label={`${title} — этап ${etapLabel(etap)}`}
    >
      <div className={styles.media}>
        <span className={styles.badge}>Этап {etapLabel(etap)}</span>
        {image ? (
          <img src={image} alt="" className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.imagePlaceholder} aria-hidden />
        )}
      </div>
      <div className={styles.text}>
        <h3 className={styles.title}>{title}</h3>
        {desc ? <p className={styles.desc}>{desc}</p> : null}
      </div>
    </Link>
  );
};

export default Step;
