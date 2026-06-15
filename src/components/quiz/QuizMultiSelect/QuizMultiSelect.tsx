import React, { useState } from 'react';
import { Button } from '@/components/button/Button';
import styles from './QuizMultiSelect.module.scss';

export interface MultiSelectOption<T extends string = string> {
  id: T;
  label: string;
}

interface QuizMultiSelectProps<T extends string> {
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  onConfirm: () => void;
  error?: string | null;
}

export function QuizMultiSelect<T extends string>({
  options,
  selected,
  onChange,
  onConfirm,
  error,
}: QuizMultiSelectProps<T>) {
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = (id: T) => {
    setLocalError(null);
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleReset = () => {
    onChange([]);
    setLocalError(null);
  };

  const handleConfirm = () => {
    if (selected.length === 0) {
      setLocalError('Выберите хотя бы один вариант');
      return;
    }
    setLocalError(null);
    onConfirm();
  };

  const displayError = error ?? localError;

  return (
    <div className={styles.wrapper}>
      <div className={styles.list} role="group">
        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={`${styles.option} ${isSelected ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={isSelected}
                onChange={() => toggle(option.id)}
              />
              <span className={styles.label}>{option.label}</span>
            </label>
          );
        })}
      </div>

      {displayError && <p className={styles.error}>{displayError}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} onClick={handleReset}>
          Сбросить выбор
        </button>
        <div className={styles.confirmButton}>
          <Button text="Готово" onClick={handleConfirm} />
        </div>
      </div>
    </div>
  );
}
