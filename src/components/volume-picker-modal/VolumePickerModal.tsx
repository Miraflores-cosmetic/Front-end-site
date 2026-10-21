import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  isVolumeOptionOutOfStock,
  type VolumePickerOption,
} from '@miraflores/volume-picker';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './VolumePickerModal.module.scss';

export type { VolumePickerOption };

type VolumePickerModalProps = {
  open: boolean;
  title?: string;
  options: VolumePickerOption[];
  onSelect: (option: VolumePickerOption) => void;
  onClose: () => void;
};

export function VolumePickerModal({
  open,
  title = 'Выберите объём',
  options,
  onSelect,
  onClose,
}: VolumePickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, modalRef, onClose);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={styles.overlay} onClick={onClose} role="presentation">
          <motion.div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="volume-picker-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <p id="volume-picker-title" className={styles.title}>
              {title}
            </p>
            <ul className={styles.list} role="listbox" aria-label={title}>
              {options.map((opt) => {
                const oos = isVolumeOptionOutOfStock(opt);
                const priceLabel = `${Math.round(opt.price).toLocaleString('ru-RU')}₽`;
                const oldLabel =
                  opt.oldPrice != null && opt.oldPrice > opt.price
                    ? `${Math.round(opt.oldPrice).toLocaleString('ru-RU')}₽`
                    : null;
                return (
                  <li key={opt.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      aria-disabled={oos || undefined}
                      disabled={oos}
                      className={[styles.option, oos ? styles.optionOos : '']
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        if (oos) return;
                        onSelect(opt);
                      }}
                    >
                      <span className={styles.optionLabel}>
                        {opt.label}
                        {oos ? (
                          <span className={styles.oosHint}>нет в наличии</span>
                        ) : null}
                      </span>
                      <span className={styles.optionPrice}>
                        {oldLabel ? (
                          <span className={styles.oldPrice}>{oldLabel}</span>
                        ) : null}
                        <span className={styles.price}>{priceLabel}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Отмена
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
