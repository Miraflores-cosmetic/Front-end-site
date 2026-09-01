import React, { InputHTMLAttributes } from 'react';
import { TextField } from '../TextField';

interface CustomInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  value?: string;
  error?: boolean | string;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Обёртка над TextField (Jcos FloatingTextField) для checkout и форм. */
const Input: React.FC<CustomInputProps> = ({
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  ...props
}) => {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      error={error}
      required={required}
      {...props}
    />
  );
};

export default Input;
