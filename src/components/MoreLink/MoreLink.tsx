import React from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import styles from './MoreLink.module.scss';

export type MoreLinkProps = {
  to: LinkProps['to'];
  /** По умолчанию «ВСЕ» — как Win-Win 2.0 у заголовка (без стрелки). */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Ссылка у заголовка секции: рядом с title, чуть выше, зелёная, без стрелки.
 */
export function MoreLink({ to, children = 'ВСЕ', className }: MoreLinkProps) {
  return (
    <Link
      to={to}
      className={[styles.link, className].filter(Boolean).join(' ')}
    >
      {children}
    </Link>
  );
}

/** Заголовок + MoreLink сразу справа (flex, gap 8px). */
export function SectionTitleRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.titleRow, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

export default MoreLink;
