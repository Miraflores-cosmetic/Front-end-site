import React from 'react';
import styles from './LogoutConfirmationModal.module.scss';
import { motion, AnimatePresence } from 'framer-motion';

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
    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className={styles.title}>Уверены, что хотите выйти?</p>
                        <div className={styles.actions}>
                            <button className={styles.confirmBtn} onClick={onConfirm}>
                                Да
                            </button>
                            <button className={styles.cancelBtn} onClick={onClose}>
                                Нет
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
