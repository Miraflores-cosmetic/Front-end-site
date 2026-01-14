// src/components/toast/toast.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import styles from './toast.module.scss'; // <- CSS module import

type ToastType = 'success' | 'error' | 'warning';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const Toast: React.FC<ToastProps> = ({ id, type, message, onClose }) => {
  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle className={styles.toast__icon_svg} />,
    error: <XCircle className={styles.toast__icon_svg} />,
    warning: <AlertCircle className={styles.toast__icon_svg} />
  };

  const typeClass: Record<ToastType, string> = {
    success: styles['toast--success'],
    error: styles['toast--error'],
    warning: styles['toast--warning']
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`${styles.toast} ${typeClass[type]}`}
    >
      <div className={styles.toast__icon}>{icons[type]}</div>
      <p className={styles.toast__message}>{message}</p>
      <button
        onClick={() => onClose(id)}
        className={styles.toast__close}
        aria-label="Close notification"
      >
        <X className={styles.toast__close_icon}/>
      </button>
    </motion.div>
  );
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastType, message: string): void => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts(prev => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string): void => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast: ToastContextType = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message)
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.toastContainer}>
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <Toast key={t.id} {...t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
export default ToastProvider;
