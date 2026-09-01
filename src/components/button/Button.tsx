import React from 'react';
import styles from './Button.module.scss';

type Status = 'success' | 'error';

interface StatusButtonProps {
  text: string;
  status?: Status;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<StatusButtonProps> = ({
  text,
  status = 'success',
  onClick,
  disabled = false,
  type = 'button',
}) => {
  const className = `${styles.button} ${styles[status]}`;
  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      <p> {text}</p>
    </button>
  );
};
