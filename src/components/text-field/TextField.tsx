import React from 'react';
import styles from './TextField.module.scss';

interface TextFieldProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  rightLinkText?: string;
  onRightLinkClick?: () => void;
  disabled?: boolean;
  error?: string | null;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  rightLinkText,
  onRightLinkClick,
  disabled,
  error,
  onBlur
}) => (
  <div className={styles.wrapper}>
    <div className={styles.labelRow}>
      {label && <label>{label}</label>}
      {rightLinkText && (
        <p className={styles.link} onClick={onRightLinkClick}>
          {rightLinkText}
        </p>
      )}
    </div>
    <input
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
    />
    {error && <p className={styles.error}>{error}</p>}
  </div>
);
