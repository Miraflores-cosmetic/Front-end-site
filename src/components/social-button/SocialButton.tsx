import React from 'react';
import styles from './SocialButton.module.scss';

interface SocialButtonProps {
  icon: string; // например <img /> или <SvgIcon />
  text: string;
  onClick: () => void;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ icon, text, onClick }) => {
  return (
    <button className={styles.button} onClick={onClick}>
      <img src={icon} alt={text} className={styles.socialIcon} />{' '}
      <p className={styles.name}>{text}</p>
    </button>
  );
};
