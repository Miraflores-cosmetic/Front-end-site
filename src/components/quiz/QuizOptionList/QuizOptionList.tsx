import React from 'react';
import styles from './QuizOptionList.module.scss';

export interface QuizOption<T extends string = string> {
  id: T;
  label: string;
}

interface QuizOptionListProps<T extends string> {
  options: QuizOption<T>[];
  selected: T | null;
  onSelect: (id: T) => void;
}

export function QuizOptionList<T extends string>({
  options,
  selected,
  onSelect,
}: QuizOptionListProps<T>) {
  return (
    <div className={styles.list} role="radiogroup">
      {options.map((option, index) => (
        <button
          key={`${option.id}-${index}`}
          type="button"
          role="radio"
          aria-checked={selected === option.id}
          className={`${styles.option} ${selected === option.id ? styles.selected : ''}`}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
