import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.scss';

interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value?: string;
  error?: boolean;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<CustomInputProps> = ({ label, value, onChange, error, required, ...props }) => {
  return (
    <div className={`${styles.inputWrapper} ${error ? styles.error : ''}`}>
      {label && (
        <label className={styles.label}>
          {label} {required && <span className={styles.asterisk}>*</span>}
        </label>
      )}
      <input className={styles.input} value={value} onChange={onChange} {...props} />
    </div>
  );
};

export default Input;
