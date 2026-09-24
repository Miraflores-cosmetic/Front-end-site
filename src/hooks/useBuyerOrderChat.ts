import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiJson, ApiError, uploadsUrl } from '@/api/apiClient';
import { useChatAttachments } from '@/hooks/useChatAttachments';
import type { ChatWindowMessage } from '@/components/order-chat/ChatWindow';
import {
  buyerChatDeletePath,
  buyerChatMessagesListPath,
  buyerChatMessagesPath,
  buyerChatReadPath,
  buyerChatSocketJoinPayload,
  buyerChatSocketLeavePayload,
  buyerChatTargetKey,
  buyerChatUploadPath,
  buyerChatUploadRevokePath,
  type BuyerOrderChatTarget,
} from '@/lib/orderChat/buyerChatPaths';
import {
  CHAT_MESSAGES_PAGE_DEFAULT,
  ORDER_CHAT_ATTACHMENT_REFS_PAYLOAD_MAX_CHARS,
  ORDER_CHAT_ATTACHMENTS_MAX,
  ORDER_CHAT_POST_BODY_MAX_CHARS,
  ORDER_CHAT_SOCKET_UPDATED_EVENT,
  ORDER_CHAT_STAFF_AVATAR_PLACEHOLDER,
  ORDER_CHAT_UPLOAD_MAX_FILE_BYTES,
} from '@/lib/orderChat/constants';
import { mapOrderChatApiMessageToUi } from '@miraflores/order-chat-core';
import { orderChatFileTooLargeUserMessage } from '@/lib/orderChat/orderChatUploadError';
import { dispatchOrderChatUnreadRefresh } from '@/lib/orderChat/orderChatEvents';
import {
  emitOrderChatRoomJoin,
  getOrCreateSharedOrderChatSocket,
  registerOrderChatWsSession,
  fetchBuyerOrderChatWsToken,
  ORDER_CHAT_WS_SESSION_EXPIRED_EVENT,
  waitOrderChatSocketConnect,
  type OrderChatSocket,
} from '@/lib/orderChat/orderChatWsShared';
import type { OrderChatApiMessage, OrderChatMessagesResponse } from '@/lib/orderChat/types';

function mediaUrl(path: string | null | undefined): string | undefined {
  const u = uploadsUrl(path ?? '');
  return u ?? undefined;
}

async function parseOrderChatUploadFromBody(body: unknown): Promise<{
  url: string;
  filename: string;
  mimeType: string;
  kind: 'FILE' | 'IMAGE';
}> {
  if (!body || typeof body !== 'object') throw new Error('Пустой ответ при загрузке');
  const o = body as Record<string, unknown>;
  const url = typeof o.url === 'string' ? o.url.trim() : '';
  if (!url) throw new Error('Нет ссылки на файл');
  const filename = typeof o.filename === 'string' ? o.filename : 'file';
  const mimeType = typeof o.mimeType === 'string' ? o.mimeType : 'application/octet-stream';
  const kind: 'FILE' | 'IMAGE' =
    o.kind === 'IMAGE' || o.kind === 'FILE' ? o.kind : mimeType.startsWith('image/') ? 'IMAGE' : 'FILE';
  return { url, filename, mimeType, kind };
}

function mapApiToUi(
  m: OrderChatApiMessage,
  viewerUserId: string | null,
  timeLocale: string,
  customerAvatarUrl?: string | null,
): ChatWindowMessage {
  return mapOrderChatApiMessageToUi(m, {
    variant: 'account',
    viewerUserId,
    timeLocale,
    labels: { you: 'Вы', manager: 'Менеджер', customer: 'Клиент', brand: 'Miraflores' },
    resolveFileUrl: (u) => mediaUrl(u) ?? u,
    resolveOptionalUrl: (u) => mediaUrl(u ?? null),
    staffAvatarPlaceholder: ORDER_CHAT_STAFF_AVATAR_PLACEHOLDER,
    viewerAvatarUrl: customerAvatarUrl,
  });
}

function mergeTailMessages(
  prev: ChatWindowMessage[],
  incoming: ChatWindowMessage[],
): ChatWindowMessage[] {
  if (!incoming.length) return prev;
  const seen = new Set(prev.map((x) => x.id));
  const added = incoming.filter((m) => !seen.has(m.id));
  if (!added.length) return prev;
  return [...prev, ...added];
}

export function useBuyerOrderChat(opts: {
  target: BuyerOrderChatTarget | null;
  enabled: boolean;
  customerUserId?: string | null;
  customerAvatarUrl?: string | null;
  timeLocale?: string;
  /** Панель чата видна (не скрытая вкладка / не список тредов на mobile). */
  panelVisible?: boolean;
}) {
  const {
    target,
    enabled,
    customerUserId,
    customerAvatarUrl,
    timeLocale = 'ru-RU',
    panelVisible = false,
  } = opts;
  const targetKey = target ? buyerChatTargetKey(target) : '';
  const targetRef = useRef<BuyerOrderChatTarget | null>(null);
  targetRef.current = target;
  const customerAvatarRef = useRef(customerAvatarUrl);
  customerAvatarRef.current = customerAvatarUrl;
  const timeLocaleRef = useRef(timeLocale);
  timeLocaleRef.current = timeLocale;

  const [messages, setMessages] = useState<ChatWindowMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hasOlderHistory, setHasOlderHistory] = useState(false);
  const [loadingOlderHistory, setLoadingOlderHistory] = useState(false);
  const viewerRef = useRef<string | null>(customerUserId ?? null);
  const conversationIdRef = useRef<string | null>(null);
  const messagesRef = useRef<ChatWindowMessage[]>([]);
  const panelVisibleRef = useRef(panelVisible);
  panelVisibleRef.current = panelVisible;
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  viewerRef.current = customerUserId ?? viewerRef.current;

  const markReadIfVisible = useCallback(async () => {
    if (!panelVisibleRef.current) return;
    const t = targetRef.current;
    if (!t) return;
    await apiJson(buyerChatReadPath(t), 'POST', {}).catch(() => undefined);
    dispatchOrderChatUnreadRefresh();
  }, [targetKey]);

  const scheduleMarkReadDebounced = useCallback(() => {
    if (!panelVisibleRef.current) return;
    if (markReadTimerRef.current != null) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      markReadTimerRef.current = null;
      void markReadIfVisible();
    }, 450);
  }, [markReadIfVisible]);

  const revokeUploadedFile = useCallback(
    async (fileUrl: string) => {
      const t = targetRef.current;
      if (!t) return;
      await apiJson(buyerChatUploadRevokePath(t), 'POST', { fileUrl });
    },
    [targetKey],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const t = targetRef.current;
      if (!t) throw new Error('Чат недоступен');
      const fd = new FormData();
      fd.append('file', file);
      const path = buyerChatUploadPath(t);
      try {
        const body = await apiFetch<unknown>(path, { method: 'POST', body: fd });
        const row = await parseOrderChatUploadFromBody(body);
        return {
          url: row.url,
          kind: row.kind,
          mimeType: row.mimeType,
          filename: row.filename,
        };
      } catch (e) {
        if (e instanceof ApiError && e.status === 413) {
          throw new Error(orderChatFileTooLargeUserMessage());
        }
        throw e;
      }
    },
    [targetKey],
  );

  const {
    uploadBusy,
    pendingOutgoingAttachments,
    canSendAttachmentMessage,
    pendingAttachmentsHint,
    attachChatFiles,
    removePendingChatAttachment,
    getReadyAttachments,
    clearPendingAttachments,
  } = useChatAttachments({
    enabled: Boolean(target && enabled),
    uploadFile,
    revokeFile: revokeUploadedFile,
    onError: setError,
    maxFileBytes: ORDER_CHAT_UPLOAD_MAX_FILE_BYTES,
    maxAttachments: ORDER_CHAT_ATTACHMENTS_MAX,
    fileTooLargeMessage: orderChatFileTooLargeUserMessage(),
    maxAttachmentsMessage: `Не более ${ORDER_CHAT_ATTACHMENTS_MAX} вложений в сообщении`,
  });

  messagesRef.current = messages;

  const loadOlderChatMessages = useCallback(async () => {
    const t = targetRef.current;
    if (!t || !hasOlderHistory || loadingOlderHistory) return;
    const oldestId = messagesRef.current[0]?.id;
    if (!oldestId) return;
    setLoadingOlderHistory(true);
    setError(null);
    try {
      const data = await apiFetch<OrderChatMessagesResponse>(
        buyerChatMessagesListPath(t, {
          limit: CHAT_MESSAGES_PAGE_DEFAULT,
          before: oldestId,
        }),
      );
      const mapped = (data.messages ?? []).map((m) =>
        mapApiToUi(m, viewerRef.current, timeLocaleRef.current, customerAvatarRef.current),
      );
      setHasOlderHistory(Boolean(data.hasOlder));
      setMessages((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...mapped.filter((x) => !seen.has(x.id)), ...prev];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось подгрузить историю');
    } finally {
      setLoadingOlderHistory(false);
    }
  }, [hasOlderHistory, loadingOlderHistory, targetKey]);

  useEffect(() => {
    if (panelVisible && enabled && target) {
      void markReadIfVisible();
    }
  }, [panelVisible, enabled, targetKey, markReadIfVisible, target]);

  const syncNewerMessages = useCallback(async () => {
    const t = targetRef.current;
    if (!t) return;
    let tail = messagesRef.current;
    for (;;) {
      const lastId = tail[tail.length - 1]?.id;
      if (!lastId) return;
      const data = await apiFetch<OrderChatMessagesResponse>(
        buyerChatMessagesListPath(t, {
          limit: CHAT_MESSAGES_PAGE_DEFAULT,
          after: lastId,
        }),
      );
      if (data.conversationId) conversationIdRef.current = data.conversationId;
      const mapped = (data.messages ?? []).map((m) =>
        mapApiToUi(m, viewerRef.current, timeLocaleRef.current, customerAvatarRef.current),
      );
      if (!mapped.length) return;
      tail = mergeTailMessages(tail, mapped);
      messagesRef.current = tail;
      setMessages(tail);
      if (mapped.length < CHAT_MESSAGES_PAGE_DEFAULT) return;
    }
  }, [targetKey]);

  useEffect(() => {
    const t = targetRef.current;
    if (!enabled || !t) {
      clearPendingAttachments();
      setMessages([]);
      setError(null);
      setLoading(false);
      setHasOlderHistory(false);
      setLoadingOlderHistory(false);
      conversationIdRef.current = null;
      return undefined;
    }

    clearPendingAttachments();
    setMessages([]);
    setError(null);
    setHasOlderHistory(false);
    setLoadingOlderHistory(false);
    conversationIdRef.current = null;
    setLoading(true);

    let disposed = false;
    let activeSocket: OrderChatSocket | null = null;
    let unregisterSession: (() => void) | null = null;
    let socketListenersReady = false;
    let onSocketReconnect: (() => void) | null = null;

    const joinEvent = t.kind === 'order' ? 'join_order_chat' : 'join_support_chat';
    const leaveEvent = t.kind === 'order' ? 'leave_order_chat' : 'leave_support_chat';
    const joinPayload = buyerChatSocketJoinPayload(t);
    const leavePayload = buyerChatSocketLeavePayload(t);

    const onCreated = (payload: OrderChatApiMessage) => {
      if (disposed || !payload?.id) return;
      const cur = conversationIdRef.current;
      if (cur && payload.conversationId && payload.conversationId !== cur) return;
      if (!cur && payload.conversationId) conversationIdRef.current = payload.conversationId;
      setMessages((prev) => {
        if (prev.some((x) => x.id === payload.id)) return prev;
        return [
          ...prev,
          mapApiToUi(payload, viewerRef.current, timeLocaleRef.current, customerAvatarRef.current),
        ];
      });
      if (payload.authorRole === 'STAFF') {
        dispatchOrderChatUnreadRefresh();
        scheduleMarkReadDebounced();
      }
    };

    const onDeleted = (payload: { id?: string }) => {
      if (disposed || !payload?.id) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.id
            ? { ...m, isDeleted: true, content: undefined, documents: undefined, images: undefined, deletable: false }
            : m,
        ),
      );
    };

    const onCreatedSocket = (...args: unknown[]) => {
      onCreated(args[0] as OrderChatApiMessage);
    };
    const onDeletedSocket = (...args: unknown[]) => {
      onDeleted(args[0] as { id?: string });
    };

    const detachSocketHandlers = () => {
      if (!activeSocket) return;
      activeSocket.off('message_created', onCreatedSocket);
      activeSocket.off('message_deleted', onDeletedSocket);
      if (onSocketReconnect) {
        activeSocket.off('connect', onSocketReconnect);
        onSocketReconnect = null;
      }
    };

    const rejoinRoomAndSyncNewer = async (socket: OrderChatSocket) => {
      await emitOrderChatRoomJoin(socket, joinEvent, joinPayload);
      if (disposed) return;
      await syncNewerMessages();
    };

    const bindSocketHandlers = (socket: OrderChatSocket) => {
      detachSocketHandlers();
      activeSocket = socket;
      socket.on('message_created', onCreatedSocket);
      socket.on('message_deleted', onDeletedSocket);
      onSocketReconnect = () => {
        if (!socketListenersReady || disposed) return;
        void rejoinRoomAndSyncNewer(socket);
      };
      socket.on('connect', onSocketReconnect);
    };

    const onSocketLayerUpdated = ((ev: Event) => {
      const ce = ev as CustomEvent<{ variant?: string; socket?: OrderChatSocket }>;
      if (ce.detail?.variant !== 'account' || disposed || !ce.detail.socket) return;
      bindSocketHandlers(ce.detail.socket);
      void rejoinRoomAndSyncNewer(ce.detail.socket);
    }) as EventListener;

    const onSessionExpired = ((ev: Event) => {
      const ce = ev as CustomEvent<{ variant?: string }>;
      if (ce.detail?.variant !== 'account' || disposed) return;
      setError('Сессия чата истекла. Обновите страницу или войдите снова.');
    }) as EventListener;

    window.addEventListener(ORDER_CHAT_SOCKET_UPDATED_EVENT, onSocketLayerUpdated);
    window.addEventListener(ORDER_CHAT_WS_SESSION_EXPIRED_EVENT, onSessionExpired);

    const loadHistory = async (): Promise<boolean> => {
      const data = await apiFetch<OrderChatMessagesResponse>(
        buyerChatMessagesListPath(t, { limit: CHAT_MESSAGES_PAGE_DEFAULT }),
      );
      if (disposed) return false;
      conversationIdRef.current = data.conversationId ?? null;
      setMessages(
        (data.messages ?? []).map((m) =>
          mapApiToUi(m, viewerRef.current, timeLocaleRef.current, customerAvatarRef.current),
        ),
      );
      setHasOlderHistory(Boolean(data.hasOlder));
      if (panelVisibleRef.current) void markReadIfVisible();
      return true;
    };

    const connectLive = async (): Promise<void> => {
      const wsAuth = await fetchBuyerOrderChatWsToken();
      if (disposed) return;
      viewerRef.current = wsAuth.sub ?? customerUserId ?? null;
      unregisterSession = registerOrderChatWsSession(wsAuth);
      if (disposed) {
        unregisterSession();
        unregisterSession = null;
        return;
      }

      const socket = await getOrCreateSharedOrderChatSocket(wsAuth);
      if (disposed) {
        unregisterSession?.();
        unregisterSession = null;
        return;
      }

      bindSocketHandlers(socket);
      socketListenersReady = true;

      const joinWhenConnected = async () => {
        if (disposed || !socket.connected) return;
        await emitOrderChatRoomJoin(socket, joinEvent, joinPayload);
        if (disposed) return;
        await syncNewerMessages();
        if (disposed) return;
        if (panelVisibleRef.current) void markReadIfVisible();
      };

      if (socket.connected) {
        await joinWhenConnected();
        return;
      }

      void waitOrderChatSocketConnect(socket)
        .then(() => joinWhenConnected())
        .catch(() => undefined);
    };

    void (async () => {
      setError(null);
      let historyOk = false;
      try {
        historyOk = await loadHistory();
      } catch (e) {
        if (!disposed) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить чат');
          setMessages([]);
          setHasOlderHistory(false);
        }
      } finally {
        if (!disposed) setLoading(false);
      }

      if (!historyOk || disposed) return;

      try {
        await connectLive();
      } catch (e) {
        if (!disposed) {
          const liveMsg = e instanceof Error ? e.message : 'Нет live-обновлений';
          setError((prev) =>
            prev ? `${prev}. ${liveMsg}` : `${liveMsg} — переписка загружена без WebSocket`,
          );
        }
      }
    })();

    return () => {
      disposed = true;
      socketListenersReady = false;
      if (markReadTimerRef.current != null) clearTimeout(markReadTimerRef.current);
      window.removeEventListener(ORDER_CHAT_SOCKET_UPDATED_EVENT, onSocketLayerUpdated);
      window.removeEventListener(ORDER_CHAT_WS_SESSION_EXPIRED_EVENT, onSessionExpired);
      detachSocketHandlers();
      activeSocket?.emit(leaveEvent, leavePayload);
      unregisterSession?.();
    };
  }, [
    enabled,
    targetKey,
    customerUserId,
    clearPendingAttachments,
    syncNewerMessages,
    markReadIfVisible,
    scheduleMarkReadDebounced,
  ]);

  const sendText = useCallback(
    async (text: string): Promise<boolean> => {
      const t = targetRef.current;
      if (!t) return false;
      const body = text.trim();
      const ready = getReadyAttachments();
      if (!body && ready.length === 0) return false;
      if (body.length > ORDER_CHAT_POST_BODY_MAX_CHARS) {
        setError(`Сообщение длиннее ${ORDER_CHAT_POST_BODY_MAX_CHARS.toLocaleString()} символов`);
        return false;
      }
      if (ready.length > ORDER_CHAT_ATTACHMENTS_MAX) {
        setError(`Не более ${ORDER_CHAT_ATTACHMENTS_MAX} вложений`);
        return false;
      }
      let refsPayloadChars = 0;
      for (const r of ready) {
        const mt = r.mimeType?.trim() ?? '';
        refsPayloadChars += (r.fileUrl?.length ?? 0) + r.filename.length + mt.length;
      }
      if (refsPayloadChars > ORDER_CHAT_ATTACHMENT_REFS_PAYLOAD_MAX_CHARS) {
        setError('Слишком большие вложения — удалите часть файлов');
        return false;
      }

      const clientMessageId = crypto.randomUUID();
      const optimisticId = `pending:${clientMessageId}`;
      const nowIso = new Date().toISOString();
      const timeLabel = new Date().toLocaleTimeString(timeLocaleRef.current, {
        hour: '2-digit',
        minute: '2-digit',
      });
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          senderName: 'Вы',
          senderAvatarUrl: customerAvatarRef.current ?? undefined,
          timeLabel,
          content: body || undefined,
          isPending: true,
          ocAuthorRole: 'CUSTOMER',
          ocAuthorUserId: viewerRef.current ?? undefined,
          ocCreatedAtIso: nowIso,
        },
      ]);

      setSending(true);
      setError(null);
      try {
        const created = await apiJson<OrderChatApiMessage>(buyerChatMessagesPath(t), 'POST', {
          clientMessageId,
          body: body || undefined,
          attachments:
            ready.length > 0
              ? ready.map((r) => ({
                  fileUrl: r.fileUrl!,
                  filename: r.filename,
                  mimeType: r.mimeType,
                  kind: r.kind,
                }))
              : undefined,
        });
        setMessages((prev) => {
          const withoutPending = prev.filter((m) => m.id !== optimisticId);
          if (withoutPending.some((x) => x.id === created.id)) return withoutPending;
          return [
            ...withoutPending,
            mapApiToUi(created, viewerRef.current, timeLocaleRef.current, customerAvatarRef.current),
          ];
        });
        clearPendingAttachments();
        await markReadIfVisible();
        return true;
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setError(e instanceof Error ? e.message : 'Не удалось отправить');
        return false;
      } finally {
        setSending(false);
      }
    },
    [targetKey, getReadyAttachments, clearPendingAttachments, markReadIfVisible],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const t = targetRef.current;
      if (!t) return;
      setError(null);
      try {
        await apiJson(buyerChatDeletePath(t, messageId), 'DELETE');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: undefined, documents: undefined, images: undefined, deletable: false }
              : m,
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось удалить');
      }
    },
    [targetKey],
  );

  return {
    chatMessages: messages,
    chatLoading: loading,
    chatError: error,
    chatComposerDisabled: loading,
    chatSendDisabled: loading || sending || uploadBusy,
    chatAttachPickerDisabled: sending || uploadBusy,
    pendingAttachmentsHint,
    pendingOutgoingAttachments,
    canSendAttachmentMessage,
    sendChatText: sendText,
    attachChatFiles,
    removePendingChatAttachment,
    deleteChatMessage: deleteMessage,
    chatHasOlderHistory: hasOlderHistory,
    chatLoadingOlderHistory: loadingOlderHistory,
    loadOlderChatMessages,
  };
}
