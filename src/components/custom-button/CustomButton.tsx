import React from 'react';
import styles from './CustomButton.module.scss';

interface CustomButtonProps {
  label: string;
  onClick: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ label, onClick, type = 'button', disabled = false }) => {
  return (
    <button onClick={onClick} type={type} className={styles.mainBtn} disabled={disabled}>
      {label}
    </button>
  );
};

export default CustomButton;
