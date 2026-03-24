import React from 'react';
import styles from './Input.module.scss';

interface CustomInputProps {
  label?: string;
  value: string;
  type?: string;
  placeholder?: string;
  imageSrc?: string;
  buttonText?: string;
  onButtonClick?: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  width?: string | number; // 🔹 Add dynamic width prop
  /** Текст ошибки с API — красная обводка и подпись */
  fieldError?: string;
}

export const Input: React.FC<CustomInputProps> = ({
  label,
  value,
  type = 'text',
  placeholder,
  imageSrc,
  buttonText,
  onButtonClick,
  onChange,
  width, // 🔹 Receive width prop
  fieldError,
}) => {
  const hasError = Boolean(fieldError?.trim());

  return (
    <div
      className={styles.wrapper}
      style={{ width }} // 🔹 Apply dynamic width
    >
      {imageSrc && <img src={imageSrc} alt='icon' className={styles.icon} />}
      {label && (
        <label className={`${styles.label} ${hasError ? styles.labelError : ''}`}>{label}</label>
      )}

      <div className={`${styles.inputRow} ${hasError ? styles.inputRowError : ''}`}>
        {type === 'password' ? (
          <div className={styles.passwordDisplay}>
            {value.split('').map((_, i) => (
              <span key={i} className={styles.dot}></span>
            ))}
          </div>
        ) : (
          <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            aria-invalid={hasError}
          />
        )}

        {buttonText && (
          <button className={styles.button} onClick={onButtonClick}>
            {buttonText}
          </button>
        )}
      </div>
      {hasError && <p className={styles.fieldErrorText}>{fieldError}</p>}
    </div>
  );
};
