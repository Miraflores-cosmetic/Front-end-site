import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './Catalog.module.scss';

export function CatalogChipDropdown({
  id,
  label,
  open,
  active = false,
  onToggle,
  onClose,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  active?: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [alignEnd, setAlignEnd] = useState(false);
  const panelId = `chip-panel-${id}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) {
      setAlignEnd(false);
      return;
    }
    const btn = buttonRef.current;
    const panel = panelRef.current;
    if (!btn || !panel) return;

    const place = () => {
      const btnRect = btn.getBoundingClientRect();
      const panelWidth = Math.max(panel.offsetWidth, 180);
      const pad = 16;
      const overflowsRight = btnRect.left + panelWidth > window.innerWidth - pad;
      setAlignEnd(overflowsRight);
    };

    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, children]);

  return (
    <div className={styles.chipWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.chip}
        data-active={active || undefined}
        data-open={open || undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={panelId}
        onClick={onToggle}
      >
        {label}
        <span className={styles.chipCaret} aria-hidden />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className={styles.chipBackdrop}
            aria-label="Закрыть"
            onClick={onClose}
          />
          <div
            ref={panelRef}
            id={panelId}
            className={styles.chipPanel}
            data-align={alignEnd ? 'end' : 'start'}
            role="listbox"
            aria-label={label}
          >
            {children}
          </div>
        </>
      ) : null}
    </div>
  );
}
