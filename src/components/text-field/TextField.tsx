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
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  rightLinkText,
  onRightLinkClick,
  disabled
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
      className={styles.input}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);
