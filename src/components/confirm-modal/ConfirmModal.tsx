import React, { useRef } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './ConfirmModal.module.scss';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmModal({
  open,
  title,
  confirmLabel = 'Да',
  cancelLabel = 'Отмена',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, modalRef, onClose);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <p id="confirm-modal-title" className={styles.title}>
          {title}
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.confirmBtn} onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
