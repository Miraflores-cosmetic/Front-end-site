import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { apiFetch, uploadsUrl } from '@/api/apiClient';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useBuyerOrderChat } from '@/hooks/useBuyerOrderChat';
import { ChatWindow } from '@/components/order-chat/ChatWindow';
import type { BuyerOrderChatTarget } from '@/lib/orderChat/buyerChatPaths';
import type { OrderChatOpenDetail } from '@/lib/orderChat/orderChatEvents';
import { buyerChatTargetKey } from '@/lib/orderChat/buyerChatPaths';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useOrderChatModalChrome } from '@/hooks/useOrderChatModalChrome';
import { useOrderChatPanelVisible } from '@/hooks/useOrderChatPanelVisible';
import { ORDER_CHAT_UNREAD_REFRESH_EVENT } from '@/lib/orderChat/orderChatEvents';
import type {
  OrderChatStartableOrder,
  OrderChatThread,
  OrderChatThreadsResponse,
} from '@/lib/orderChat/types';
import { ChatCloseIcon, ChatBackIcon, ChatOrderIcon, ChatSupportIcon } from './orderChatIcons';
import styles from './OrderChatWidget.module.scss';

const STARTABLE_COLLAPSED = 3;

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** «14:05», «вчера», «12 сент.», «03.02.2025». */
function formatThreadTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (dayDiff === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (dayDiff === 1) return 'вчера';
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ActiveSelection =
  | { kind: 'support' }
  | { kind: 'order'; orderId: string; title: string };

function threadToSelection(thread: OrderChatThread): ActiveSelection {
  if (thread.kind === 'SUPPORT') return { kind: 'support' };
  return {
    kind: 'order',
    orderId: thread.orderId ?? '',
    title: thread.title,
  };
}

function selectionToTarget(selection: ActiveSelection, customerUserId: string): BuyerOrderChatTarget | null {
  if (selection.kind === 'support') {
    return { kind: 'support', customerUserId };
  }
  if (!selection.orderId) return null;
  return { kind: 'order', orderId: selection.orderId };
}

function chatTitle(selection: ActiveSelection | null): string {
  if (!selection) return 'Сообщения';
  if (selection.kind === 'support') return 'Поддержка';
  return selection.title || 'Чат по заказу';
}

function ChatSubtitle({ selection }: { selection: ActiveSelection | null }) {
  if (!selection) return null;
  if (selection.kind === 'support') {
    return (
      <p className={styles.shellSubtitle}>
        <span className={styles.onlineStatus}>
          <span className={styles.onlineDot} aria-hidden />
          Онлайн
        </span>
        {' · Общие вопросы'}
      </p>
    );
  }
  return <p className={styles.shellSubtitle}>Вопросы по заказу</p>;
}

function ThreadAvatar({ support }: { support: boolean }) {
  return (
    <span
      className={`${styles.threadAvatar} ${support ? styles.threadAvatarOnline : ''}`}
      aria-hidden
    >
      {support ? <ChatSupportIcon /> : <ChatOrderIcon />}
    </span>
  );
}

function formatThreadPreview(preview: string | null): string {
  const t = preview?.trim();
  return t && t.length > 0 ? t : 'Нет сообщений';
}

function unreadLabel(n: number): string {
  return n > 99 ? '99+' : String(n);
}

export type OrderChatModalProps = {
  onClose: () => void;
  initialOpenDetail?: OrderChatOpenDetail;
};

export default function OrderChatModal({ onClose, initialOpenDetail }: OrderChatModalProps) {
  const shellTitleId = useId();
  const startableTitleId = useId();
  const isMobile = useScreenMatch();
  const { isAuth, me } = useSelector((state: RootState) => state.authSlice);

  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [threads, setThreads] = useState<OrderChatThread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);

  const customerUserId = me?.id ?? null;
  const customerAvatarUrl = uploadsUrl(me?.avatar?.url ?? null);

  useOrderChatModalChrome(true);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const shellRef = useRef<HTMLDivElement>(null);
  const chatPaneRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, shellRef, handleClose);

  const applyOpenDetail = useCallback((detail: OrderChatOpenDetail | undefined) => {
    const sel = detail?.selection;
    if (!sel) {
      setSelection(null);
      setMobileShowChat(false);
      return;
    }
    if (sel.kind === 'support') {
      setSelection({ kind: 'support' });
      setMobileShowChat(true);
      return;
    }
    setSelection({
      kind: 'order',
      orderId: sel.orderId,
      title: sel.title?.trim() || `Заказ`,
    });
    setMobileShowChat(true);
  }, []);

  useEffect(() => {
    if (initialOpenDetail) applyOpenDetail(initialOpenDetail);
  }, [initialOpenDetail, applyOpenDetail]);

  const target = useMemo(() => {
    if (!isAuth || !selection || !customerUserId) return null;
    return selectionToTarget(selection, customerUserId);
  }, [isAuth, selection, customerUserId]);

  const chatThreadKey = target ? buyerChatTargetKey(target) : 'none';

  const showThreadList = !isMobile || !mobileShowChat;
  const showChatPane = !isMobile || mobileShowChat;
  const mobileChatOpen = isMobile && mobileShowChat;
  const chatPanelActive = Boolean(isAuth && target && showChatPane && selection);
  const chatPanelVisible = useOrderChatPanelVisible(chatPaneRef, chatPanelActive);

  const chat = useBuyerOrderChat({
    target,
    enabled: isAuth && Boolean(target),
    customerUserId,
    customerAvatarUrl,
    panelVisible: chatPanelVisible,
  });

  const [startableOrders, setStartableOrders] = useState<OrderChatStartableOrder[]>([]);
  const [startableExpanded, setStartableExpanded] = useState(false);

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!isAuth) return;
      if (!silent) setThreadsLoading(true);
      try {
        const data = await apiFetch<OrderChatThreadsResponse>('/account/chat/threads');
        setThreads(data.threads ?? []);
        setStartableOrders(data.startableOrders ?? []);
      } catch {
        if (!silent) {
          setThreads([]);
          setStartableOrders([]);
        }
      } finally {
        if (!silent) setThreadsLoading(false);
      }
    },
    [isAuth],
  );

  useEffect(() => {
    if (!isAuth) {
      setThreadsLoading(false);
      return;
    }
    void loadThreads();
  }, [isAuth, loadThreads]);

  // После отправки / прочтения / ответа поддержки — пересортировать список и обновить бейджи.
  useEffect(() => {
    if (!isAuth) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void loadThreads(true), 400);
    };
    window.addEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(ORDER_CHAT_UNREAD_REFRESH_EVENT, onRefresh);
    };
  }, [isAuth, loadThreads]);

  useEffect(() => {
    if (!isAuth || selection || threadsLoading) return;
    if (initialOpenDetail?.selection) return;
    if (threads.length === 0) {
      setSelection({ kind: 'support' });
      setMobileShowChat(isMobile);
      return;
    }
    const first = threads[0];
    setSelection(threadToSelection(first));
    if (!isMobile) setMobileShowChat(true);
  }, [isAuth, selection, threads, threadsLoading, isMobile, initialOpenDetail?.selection]);

  const pickThread = (thread: OrderChatThread) => {
    setSelection(threadToSelection(thread));
    setMobileShowChat(true);
  };

  const pickStartableOrder = (order: OrderChatStartableOrder) => {
    setSelection({ kind: 'order', orderId: order.orderId, title: `Заказ ${order.orderNumber}` });
    setMobileShowChat(true);
  };

  const visibleStartable = startableExpanded
    ? startableOrders
    : startableOrders.slice(0, STARTABLE_COLLAPSED);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={shellRef}
        className={styles.shell}
        role="dialog"
        aria-modal="true"
        aria-labelledby={shellTitleId}
        tabIndex={-1}
      >
        <header className={styles.shellHead}>
          {mobileChatOpen ? (
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setMobileShowChat(false)}
              aria-label="Все диалоги"
            >
              <ChatBackIcon />
            </button>
          ) : null}
          <div className={styles.shellTitleWrap}>
            <h2 id={shellTitleId} className={styles.shellTitle}>
              {mobileChatOpen ? chatTitle(selection) : 'Сообщения'}
            </h2>
            {mobileChatOpen ? <ChatSubtitle selection={selection} /> : null}
          </div>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрыть">
            <ChatCloseIcon />
          </button>
        </header>

        {chat.chatError?.includes('Сессия чата') ? (
          <p className={styles.wsSessionBanner} role="status">
            {chat.chatError}
          </p>
        ) : null}

        <div className={`${styles.body} ${isMobile ? styles.bodySingle : ''}`}>
          {showThreadList ? (
            <aside className={styles.threads} aria-label="Диалоги">
              {threadsLoading ? (
                <p className={styles.threadsHint}>Загрузка…</p>
              ) : threads.length === 0 ? (
                <p className={styles.threadsHint}>
                  Напишите в поддержку — мы ответим в этом окне.
                </p>
              ) : (
                <ul className={styles.threadList}>
                  {threads.map((thread) => {
                    const sel = threadToSelection(thread);
                    const active =
                      selection?.kind === sel.kind &&
                      (sel.kind === 'support' ||
                        (selection?.kind === 'order' &&
                          sel.kind === 'order' &&
                          selection.orderId === sel.orderId));
                    const unread = thread.unreadCount > 0;
                    const time = formatThreadTime(thread.lastMessageAt);
                    return (
                      <li key={`${thread.kind}-${thread.orderId ?? 'support'}`}>
                        <button
                          type="button"
                          className={[
                            styles.threadBtn,
                            active ? styles.threadBtnActive : '',
                            unread ? styles.threadBtnUnread : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-current={active ? 'true' : undefined}
                          onClick={() => pickThread(thread)}
                        >
                          <ThreadAvatar support={thread.kind === 'SUPPORT'} />
                          <span className={styles.threadMain}>
                            <span className={styles.threadRow}>
                              <span className={styles.threadTitle}>{thread.title}</span>
                              {time ? <span className={styles.threadTime}>{time}</span> : null}
                            </span>
                            <span className={styles.threadRow}>
                              <span className={styles.threadPreview}>
                                {formatThreadPreview(thread.lastMessagePreview)}
                              </span>
                              {unread ? (
                                <span
                                  className={styles.threadUnread}
                                  aria-label={`${thread.unreadCount} непрочитанных`}
                                >
                                  {unreadLabel(thread.unreadCount)}
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {!threadsLoading && startableOrders.length > 0 ? (
                <section className={styles.startable} aria-labelledby={startableTitleId}>
                  <h3 id={startableTitleId} className={styles.startableTitle}>
                    Начать чат по заказу
                  </h3>
                  <ul className={styles.threadList}>
                    {visibleStartable.map((order) => {
                      const active =
                        selection?.kind === 'order' && selection.orderId === order.orderId;
                      return (
                        <li key={order.orderId}>
                          <button
                            type="button"
                            className={`${styles.threadBtn} ${styles.startableBtn} ${active ? styles.threadBtnActive : ''}`}
                            aria-current={active ? 'true' : undefined}
                            onClick={() => pickStartableOrder(order)}
                          >
                            <span className={styles.threadAvatar} aria-hidden>
                              <ChatOrderIcon />
                            </span>
                            <span className={styles.threadMain}>
                              <span className={styles.threadRow}>
                                <span className={styles.threadTitle}>Заказ {order.orderNumber}</span>
                                <span className={styles.threadTime}>
                                  {formatOrderDate(order.createdAt)}
                                </span>
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {startableOrders.length > STARTABLE_COLLAPSED ? (
                    <button
                      type="button"
                      className={styles.startableToggle}
                      aria-expanded={startableExpanded}
                      onClick={() => setStartableExpanded((v) => !v)}
                    >
                      {startableExpanded
                        ? 'Свернуть'
                        : `Ещё заказы (${startableOrders.length - STARTABLE_COLLAPSED})`}
                    </button>
                  ) : null}
                </section>
              ) : null}
            </aside>
          ) : null}

          {showChatPane ? (
            <section ref={chatPaneRef} className={styles.chatPane} aria-label={chatTitle(selection)}>
              {!isMobile && selection ? (
                <div className={styles.chatPaneHead}>
                  <ThreadAvatar support={selection.kind === 'support'} />
                  <div className={styles.shellTitleWrap}>
                    <p className={styles.chatPaneTitle}>{chatTitle(selection)}</p>
                    <ChatSubtitle selection={selection} />
                  </div>
                </div>
              ) : null}
              <div className={styles.chatPaneBody}>
                <ChatWindow
                  open
                  onClose={handleClose}
                  title=""
                  threadKey={chatThreadKey}
                  variant="embedded"
                  embeddedLayout="fill"
                  hideCloseButton
                  frameless
                  messages={chat.chatMessages}
                  onSend={(text) => chat.sendChatText(text)}
                  errorText={chat.chatError}
                  composerDisabled={chat.chatComposerDisabled}
                  sendDisabled={chat.chatSendDisabled}
                  attachPickerDisabled={chat.chatAttachPickerDisabled}
                  attachmentsEnabled
                  pendingAttachmentsHint={chat.pendingAttachmentsHint}
                  pendingOutgoing={chat.pendingOutgoingAttachments}
                  onAttachFiles={(files) => void chat.attachChatFiles(files)}
                  onRemovePendingAttachment={chat.removePendingChatAttachment}
                  onDeleteMessage={(id) => void chat.deleteChatMessage(id)}
                  allowEmptySend={chat.canSendAttachmentMessage}
                  hasOlderHistory={chat.chatHasOlderHistory}
                  loadingOlderHistory={chat.chatLoadingOlderHistory}
                  onLoadOlderHistory={() => void chat.loadOlderChatMessages()}
                  messageEmptyHint={chat.chatLoading ? 'Загрузка сообщений…' : 'Напишите сообщение — мы ответим здесь'}
                  inputPlaceholder="Сообщение…"
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
