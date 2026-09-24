import { Component, type ErrorInfo, type ReactNode } from 'react';
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
      <>
        <div className={styles.backdrop} role="presentation" onClick={this.props.onClose} />
        <div className={styles.shell} role="alert">
        <header className={styles.shellHead}>
          <h2 className={styles.shellTitle}>Сообщения</h2>
          <button type="button" className={styles.closeBtn} onClick={this.props.onClose}>
            Закрыть
          </button>
        </header>
        <div className={styles.chatLoadError}>
          <p>Не удалось открыть чат. Обновите страницу или попробуйте снова.</p>
          <button
            type="button"
            className={styles.mobileBack}
            onClick={() => {
              this.setState({ failed: false });
              this.props.onRetry();
            }}
          >
            Повторить
          </button>
        </div>
      </div>
      </>
    );
  }
}
