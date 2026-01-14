import React from 'react';
import styles from './Button.module.scss';

type Status = 'success' | 'error';

interface StatusButtonProps {
  text: string;
  status?: Status;
  onClick?: () => void;
  disabled?: boolean;
}

export const Button: React.FC<StatusButtonProps> = ({
  text,
  status = 'success',
  onClick,
  disabled = false
}) => {
  const className = `${styles.button} ${styles[status]}`;
  return (
    <button type='button' className={className} onClick={onClick} disabled={disabled}>
      <p> {text}</p>
    </button>
  );
};
