import React from 'react';
import { Link } from 'react-router-dom';
import sectionStyles from './ProfileSection.module.scss';

type ProfileSectionProps = {
  title: string;
  desktopTitle?: string;
  isMobile?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
};

export function ProfileSection({
  title,
  desktopTitle,
  isMobile = false,
  onClose,
  children,
  className,
}: ProfileSectionProps) {
  const displayTitle = !isMobile && desktopTitle ? desktopTitle : title;

  return (
    <section className={`${sectionStyles.section} ${className ?? ''}`.trim()}>
      <h2 className={sectionStyles.title}>{displayTitle}</h2>
      {children}
      {isMobile && onClose ? (
        <button type="button" className={sectionStyles.closeBtn} onClick={onClose}>
          Закрыть
        </button>
      ) : null}
    </section>
  );
}

type ProfileEmptyStateProps = {
  message: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function ProfileEmptyState({
  message,
  actionLabel,
  actionHref,
  onAction,
}: ProfileEmptyStateProps) {
  return (
    <div className={sectionStyles.emptyState}>
      <p>{message}</p>
      {actionLabel && actionHref ? (
        <div className={sectionStyles.emptyActions}>
          <Link to={actionHref} className={sectionStyles.emptyCta}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
      {actionLabel && onAction && !actionHref ? (
        <div className={sectionStyles.emptyActions}>
          <button type="button" className={sectionStyles.emptyCta} onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProfileLoadingState({ message }: { message: string }) {
  return <div className={sectionStyles.loading}>{message}</div>;
}

export { sectionStyles as profileSectionStyles };
