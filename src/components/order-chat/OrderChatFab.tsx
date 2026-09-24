import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { OrderChatModalErrorBoundary } from '@/components/order-chat/OrderChatModalErrorBoundary';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { useBuyerOrderChatUnreadCount } from '@/hooks/useBuyerOrderChatUnreadCount';
import {
  ORDER_CHAT_OPEN_EVENT,
  takePendingOrderChatOpen,
  type OrderChatOpenDetail,
} from '@/lib/orderChat/orderChatEvents';
import { consumePostAuthOpenChat, stashPostAuthOpenChat } from '@/lib/orderChat/postAuthOpenChat';
import { useSiteOverlayBlocksUiChrome } from '@/hooks/useSiteOverlayBlocksUiChrome';
import styles from './OrderChatFab.module.scss';

const OrderChatModal = lazy(() => import('./OrderChatModal'));

const AUTH_PATHS_NO_FAB = new Set([
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/email-confirmation',
  '/reset-password',
  '/login/reset-password',
]);

function isOrderCheckoutPath(pathname: string): boolean {
  return pathname === '/order' || pathname.startsWith('/order/');
}

function redirectGuestToSignIn(
  navigate: ReturnType<typeof useNavigate>,
  openChat?: OrderChatOpenDetail,
): void {
  const from = `${window.location.pathname}${window.location.search}`;
  stashPostAuthOpenChat(openChat);
  navigate('/sign-in', { state: { from, openChat } });
}

export function OrderChatFab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuth } = useSelector((state: RootState) => state.authSlice);

  const [open, setOpen] = useState(false);
  const [initialOpenDetail, setInitialOpenDetail] = useState<OrderChatOpenDetail | undefined>();
  const [modalLoadKey, setModalLoadKey] = useState(0);

  const { unreadCount } = useBuyerOrderChatUnreadCount(isAuth);
  const overlayBlocksChrome = useSiteOverlayBlocksUiChrome();
  const hideFab =
    AUTH_PATHS_NO_FAB.has(pathname) ||
    isOrderCheckoutPath(pathname) ||
    (overlayBlocksChrome && !open);

  const openWithDetail = useCallback((detail?: OrderChatOpenDetail) => {
    setInitialOpenDetail(detail);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setInitialOpenDetail(undefined);
  }, []);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const ce = ev as CustomEvent<OrderChatOpenDetail>;
      if (!isAuth) {
        redirectGuestToSignIn(navigate, ce.detail);
        return;
      }
      openWithDetail(ce.detail);
      takePendingOrderChatOpen();
    };
    window.addEventListener(ORDER_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ORDER_CHAT_OPEN_EVENT, onOpen);
  }, [isAuth, navigate, openWithDetail]);

  useEffect(() => {
    if (!isAuth) return;
    const pending = takePendingOrderChatOpen();
    if (pending) {
      openWithDetail(pending);
      return;
    }
    const afterLogin = consumePostAuthOpenChat();
    if (afterLogin !== undefined) {
      openWithDetail(afterLogin);
    }
  }, [isAuth, openWithDetail]);

  const handleFabClick = () => {
    if (!isAuth) {
      redirectGuestToSignIn(navigate, {});
      return;
    }
    openWithDetail(undefined);
  };

  const fabClassName =
    pathname.startsWith('/product') ? `${styles.fab} ${styles.fabOnProductPdp}` : styles.fab;

  if (hideFab && !open) return null;

  return (
    <>
      {!hideFab ? (
        <button
          type="button"
          className={fabClassName}
          aria-label={
            isAuth && unreadCount > 0
              ? `Открыть чат, непрочитанных: ${unreadCount > 99 ? '99+' : unreadCount}`
              : 'Открыть чат'
          }
          onClick={handleFabClick}
        >
          <svg className={styles.fabIcon} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H9l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-8Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {isAuth && unreadCount > 0 ? (
            <span className={styles.fabBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          ) : null}
        </button>
      ) : null}

      {open && isAuth ? (
        <Suspense fallback={null}>
          <OrderChatModalErrorBoundary
            key={modalLoadKey}
            onClose={handleClose}
            onRetry={() => setModalLoadKey((k) => k + 1)}
          >
            <OrderChatModal onClose={handleClose} initialOpenDetail={initialOpenDetail} />
          </OrderChatModalErrorBoundary>
        </Suspense>
      ) : null}
    </>
  );
}
