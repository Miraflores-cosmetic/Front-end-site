import React from 'react';
import styles from './HomeSection.module.scss';

export type HomeSectionProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  /** Без правого inset — bleed-лента (Bestsellers). */
  bleed?: boolean;
  /** Без вертикального/горизонтального контракта (полностраничный вариант). */
  flush?: boolean;
  /** Якорь с единым scroll-margin. */
  anchor?: boolean;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-busy'?: boolean | 'true' | 'false';
};

/**
 * Контракт секции Home: ритм (gap top), правый inset 32px, якоря.
 * max-width задаёт `.homeContainer`; секции не дублируют 1536.
 */
export function HomeSection({
  children,
  className,
  id,
  style,
  bleed = false,
  flush = false,
  anchor = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-busy': ariaBusy,
}: HomeSectionProps) {
  return (
    <section
      id={id}
      style={style}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-busy={ariaBusy}
      className={[
        styles.section,
        bleed ? styles.bleed : '',
        flush ? styles.flush : '',
        anchor ? styles.anchor : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}

export default HomeSection;
