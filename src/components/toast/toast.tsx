import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import styles from './toast.module.scss';

type ToastType = 'success' | 'error' | 'warning';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
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

const DEFAULT_DURATION_MS = 2800;

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [durationMs, setDurationMs] = useState(DEFAULT_DURATION_MS);
  const [animKey, setAnimKey] = useState(0);

  const show = useCallback((type: ToastType, next: string, nextDuration = DEFAULT_DURATION_MS) => {
    setToastType(type);
    setMessage(next);
    setDurationMs(nextDuration);
    setAnimKey((k) => k + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), durationMs);
    return () => window.clearTimeout(t);
  }, [open, message, durationMs, animKey]);

  const toast = useMemo<ToastContextType>(
    () => ({
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      warning: (message: string) => show('warning', message),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {open ? (
        <div
          key={animKey}
          className={[
            styles.toast,
            toastType === 'error' ? styles.toastError : '',
            toastType === 'warning' ? styles.toastWarning : '',
          ]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
