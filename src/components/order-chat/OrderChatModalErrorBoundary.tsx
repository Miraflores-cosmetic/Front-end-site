import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ChatCloseIcon } from './orderChatIcons';
import styles from './OrderChatWidget.module.scss';

type Props = {
  children: ReactNode;
  onClose: () => void;
  onRetry: () => void;
};

type State = { failed: boolean };

export class OrderChatModalErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('OrderChatModal failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        className={styles.overlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) this.props.onClose();
        }}
      >
        <div
          className={`${styles.shell} ${styles.shellCompact}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-chat-error-title"
        >
          <header className={styles.shellHead}>
            <div className={styles.shellTitleWrap}>
              <h2 id="order-chat-error-title" className={styles.shellTitle}>
                Сообщения
              </h2>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={this.props.onClose}
              aria-label="Закрыть"
            >
              <ChatCloseIcon />
            </button>
          </header>
          <div className={styles.chatLoadError}>
            <p>Не удалось открыть чат. Обновите страницу или попробуйте снова.</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => {
                this.setState({ failed: false });
                this.props.onRetry();
              }}
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }
}
