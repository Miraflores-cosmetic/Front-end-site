import React, { useRef } from 'react';
import styles from './LogoutConfirmationModal.module.scss';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, modalRef, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay} onClick={onClose} role="presentation">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <p id="logout-modal-title" className={styles.title}>
              Уверены, что хотите выйти?
            </p>
            <div className={styles.actions}>
              <button type="button" className={styles.confirmBtn} onClick={onConfirm}>
                Да
              </button>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Нет
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
