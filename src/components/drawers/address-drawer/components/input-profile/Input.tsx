import React from 'react';
import { TextField } from '@/components/text-field/TextField';
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
  width?: string | number;
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
  width,
  fieldError,
}) => {
  return (
    <div className={styles.wrapper} style={{ width }}>
      {imageSrc ? <img src={imageSrc} alt="" className={styles.icon} /> : null}
      <TextField
        label={label}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={onChange}
        error={fieldError}
        rightLinkText={buttonText}
        onRightLinkClick={onButtonClick}
      />
    </div>
  );
};
