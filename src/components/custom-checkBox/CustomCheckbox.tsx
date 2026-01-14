import React from 'react';
import styles from './CustomChecBox.module.scss';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  borderRadius?: number | string; // ← добавили
}

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  borderRadius = 4 // ← значение по умолчанию
}) => {
  return (
    <label className={styles.wrapper}>
      <input
        type='checkbox'
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className={styles.input}
      />
      <span
        className={styles.box}
        style={{
          borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
        }}
      >
        <svg className={styles.check} viewBox='0 0 24 24' width='12' height='12' aria-hidden='true'>
          <polyline
            points='20 6 9 17 4 12'
            fill='none'
            strokeWidth='3'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </span>
    </label>
  );
};

export default CustomCheckbox;
