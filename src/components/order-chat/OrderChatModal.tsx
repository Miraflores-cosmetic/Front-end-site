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
import styles from './OrderChatWidget.module.scss';

const STARTABLE_COLLAPSED = 3;

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
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

function formatThreadPreview(preview: string | null): string {
  const t = preview?.trim();
  return t && t.length > 0 ? t : 'Нет сообщений';
}

export type OrderChatModalProps = {
  onClose: () => void;
  initialOpenDetail?: OrderChatOpenDetail;
};

export default function OrderChatModal({ onClose, initialOpenDetail }: OrderChatModalProps) {
  const shellTitleId = useId();
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

  const bodyClass =
    isMobile && mobileShowChat ? `${styles.body} ${styles.threadsOnly}` : styles.body;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className={styles.backdrop} role="presentation" onClick={handleClose} />
      <div
        ref={shellRef}
        className={styles.shell}
        role="dialog"
        aria-modal="true"
        aria-labelledby={shellTitleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.shellHead}>
          <h2 id={shellTitleId} className={styles.shellTitle}>
            {isMobile && mobileShowChat ? chatTitle(selection) : 'Сообщения'}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Закрыть">
            ×
          </button>
        </header>
        {chat.chatError?.includes('Сессия чата') ? (
          <p className={styles.wsSessionBanner} role="status">
            {chat.chatError}
          </p>
        ) : null}
        <div className={bodyClass}>
          {showThreadList ? (
            <aside className={styles.threads}>
              {threadsLoading ? (
                <p className={styles.threadsLoading}>Загрузка…</p>
              ) : threads.length === 0 ? (
                <p className={styles.threadsEmpty}>
                  Напишите в поддержку — мы ответим в этом окне.
                </p>
              ) : (
                threads.map((thread) => {
                  const sel = threadToSelection(thread);
                  const active =
                    selection?.kind === sel.kind &&
                    (sel.kind === 'support' ||
                      (selection?.kind === 'order' &&
                        sel.kind === 'order' &&
                        selection.orderId === sel.orderId));
                  return (
                    <button
                      key={`${thread.kind}-${thread.orderId ?? 'support'}`}
                      type="button"
                      className={`${styles.threadBtn} ${active ? styles.threadBtnActive : ''}`}
                      aria-current={active ? 'true' : undefined}
                      onClick={() => pickThread(thread)}
                    >
                      <span className={styles.threadTitleRow}>
                        <span className={styles.threadTitle}>{thread.title}</span>
                        {thread.unreadCount > 0 ? (
                          <span className={styles.threadUnread}>
                            {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.threadPreview}>
                        {formatThreadPreview(thread.lastMessagePreview)}
                      </span>
                    </button>
                  );
                })
              )}
              {!threadsLoading && startableOrders.length > 0 ? (
                <section className={styles.startable} aria-labelledby="order-chat-startable-title">
                  <h3 id="order-chat-startable-title" className={styles.startableTitle}>
                    Начать чат по заказу
                  </h3>
                  {visibleStartable.map((order) => {
                    const active =
                      selection?.kind === 'order' && selection.orderId === order.orderId;
                    return (
                      <button
                        key={order.orderId}
                        type="button"
                        className={`${styles.startableBtn} ${active ? styles.threadBtnActive : ''}`}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => pickStartableOrder(order)}
                      >
                        <span className={styles.startableNumber}>Заказ {order.orderNumber}</span>
                        <span className={styles.startableDate}>{formatOrderDate(order.createdAt)}</span>
                      </button>
                    );
                  })}
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
            <div ref={chatPaneRef} className={styles.chatPane}>
              {isMobile && mobileShowChat ? (
                <button
                  type="button"
                  className={styles.mobileBack}
                  onClick={() => setMobileShowChat(false)}
                >
                  ← Все диалоги
                </button>
              ) : null}
              <ChatWindow
                open
                onClose={handleClose}
                title={chatTitle(selection)}
                threadKey={chatThreadKey}
                variant="embedded"
                embeddedLayout="fill"
                hideCloseButton
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
                messageEmptyHint={chat.chatLoading ? 'Загрузка сообщений…' : 'Напишите сообщение'}
                inputPlaceholder="Сообщение…"
              />
            </div>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
