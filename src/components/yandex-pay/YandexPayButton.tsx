import React, { useEffect, useRef, useState } from 'react';
import {
  createYandexPayPayment,
  fetchYandexPayConfig,
} from '@/api/ordersApi';

const SDK_SRC = 'https://pay.yandex.ru/sdk/v1/pay.js';

type YaPayNs = {
  PaymentEnv: { Sandbox: string; Production: string };
  CurrencyCode: { Rub: string };
  ButtonType: { Pay: string };
  ButtonTheme: { Black: string; White: string; WhiteOutlined: string };
  ButtonWidth: { Auto: string; Max: string };
  createSession: (
    data: Record<string, unknown>,
    handlers: {
      onPayButtonClick: () => Promise<string>;
      onFormOpenError?: (reason: string) => void;
    },
  ) => Promise<{
    mountButton: (el: Element, opts: Record<string, unknown>) => void;
    unmountButton: (el: Element) => void;
  }>;
};

declare global {
  interface Window {
    YaPay?: YaPayNs;
    __miraYaPayLoading?: Promise<void>;
  }
}

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YaPay) return Promise.resolve();
  if (window.__miraYaPayLoading) return window.__miraYaPayLoading;
  window.__miraYaPayLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Yandex Pay SDK load failed')),
      );
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Yandex Pay SDK load failed'));
    document.head.appendChild(s);
  });
  return window.__miraYaPayLoading;
}

type Props = {
  orderId: string;
  payToken: string;
  /** Сумма к оплате, ₽ (для отображения Сплита на кнопке). */
  totalAmount: number;
  /** Exclusive: Nest гасит PENDING ЮKassa — закрываем виджет локально. */
  onExclusiveStart?: () => void;
  onAlreadyPaid?: () => void;
  onError?: (message: string) => void;
};

const FALLBACK_MSG =
  'Яндекс Пэй временно недоступен — оплатите картой / СБП ниже.';

/**
 * Кнопка Яндекс Пэй (Web SDK v4).
 * Merchant ID / env — только из Nest `/orders/yandexpay/config` (без VITE fallback).
 * onPayButtonClick → Nest createYandexPayPayment → paymentUrl.
 */
const YandexPayButton: React.FC<Props> = ({
  orderId,
  payToken,
  totalAmount,
  onExclusiveStart,
  onAlreadyPaid,
  onError,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<{ unmountButton: (el: Element) => void } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  /** Feature off / amount 0 — молча не рендерим. */
  const [hidden, setHidden] = useState(false);
  /** cfg.enabled, но SDK/session упал — показываем текст, не молчим. */
  const [failMessage, setFailMessage] = useState<string | null>(null);

  const orderIdRef = useRef(orderId);
  const payTokenRef = useRef(payToken);
  const onExclusiveStartRef = useRef(onExclusiveStart);
  const onAlreadyPaidRef = useRef(onAlreadyPaid);
  const onErrorRef = useRef(onError);
  orderIdRef.current = orderId;
  payTokenRef.current = payToken;
  onExclusiveStartRef.current = onExclusiveStart;
  onAlreadyPaidRef.current = onAlreadyPaid;
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setFailMessage(null);
    setHidden(false);

    const amount = Math.max(0, Math.round(totalAmount));
    if (amount <= 0) {
      setHidden(true);
      return;
    }

    (async () => {
      let enabled = false;
      try {
        const cfg = await fetchYandexPayConfig();
        enabled = Boolean(cfg.enabled);
        // Только Nest: иначе drift Front VITE_* ≠ API keys/env.
        const merchantId = cfg.merchantId?.trim() || '';
        if (!cfg.enabled) {
          if (!cancelled) setHidden(true);
          return;
        }
        if (!merchantId) {
          const msg =
            'Яндекс Пэй включён на сервере, но Merchant ID не пришёл — оплатите картой / СБП.';
          console.error('Yandex Pay: enabled but merchantId missing', cfg);
          if (!cancelled) {
            setFailMessage(msg);
            onErrorRef.current?.(msg);
          }
          return;
        }

        await loadSdk();
        if (cancelled || !window.YaPay || !hostRef.current) return;
        const YaPay = window.YaPay;

        const envName =
          (cfg.env || 'PRODUCTION').toUpperCase() === 'SANDBOX'
            ? YaPay.PaymentEnv.Sandbox
            : YaPay.PaymentEnv.Production;

        const paymentData = {
          env: envName,
          version: 4,
          currencyCode: YaPay.CurrencyCode.Rub,
          merchantId,
          totalAmount: amount.toFixed(2),
          availablePaymentMethods: ['CARD', 'SPLIT'],
        };

        async function onPayButtonClick() {
          onExclusiveStartRef.current?.();
          const res = await createYandexPayPayment(
            orderIdRef.current,
            payTokenRef.current,
          );
          if (res.alreadyPaid) {
            onAlreadyPaidRef.current?.();
            throw new Error('already_paid');
          }
          const url = res.paymentUrl?.trim();
          if (!url) throw new Error('Нет ссылки на оплату Яндекс Пэй');
          return url;
        }

        function onFormOpenError(reason: string) {
          onErrorRef.current?.(
            reason === 'already_paid'
              ? 'Заказ уже оплачен'
              : `Яндекс Пэй недоступен: ${reason}`,
          );
        }

        const session = await YaPay.createSession(paymentData, {
          onPayButtonClick,
          onFormOpenError,
        });
        if (cancelled || !hostRef.current) return;

        hostRef.current.innerHTML = '';
        session.mountButton(hostRef.current, {
          type: YaPay.ButtonType.Pay,
          theme: YaPay.ButtonTheme.Black,
          width: YaPay.ButtonWidth.Max,
        });
        sessionRef.current = session;
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error('Yandex Pay init failed', e);
        if (cancelled) return;
        if (enabled) {
          setFailMessage(FALLBACK_MSG);
          onErrorRef.current?.(FALLBACK_MSG);
        } else {
          // Config fetch failed or feature off path — не шумим на витрине.
          setHidden(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      const el = hostRef.current;
      const session = sessionRef.current;
      if (el && session) {
        try {
          session.unmountButton(el);
        } catch {
          /* ignore */
        }
      }
      sessionRef.current = null;
    };
  }, [orderId, totalAmount]);

  if (hidden) return null;

  if (failMessage) {
    return (
      <p
        role="status"
        style={{
          margin: '0 0 16px',
          fontSize: 13,
          lineHeight: 1.45,
          opacity: 0.85,
        }}
      >
        {failMessage}
      </p>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        ref={hostRef}
        style={{
          minHeight: ready ? undefined : 48,
          width: '100%',
        }}
      />
      {!ready ? (
        <p style={{ margin: '8px 0 0', fontSize: 13, opacity: 0.7 }}>
          Загрузка Яндекс Пэй…
        </p>
      ) : null}
    </div>
  );
};

export default YandexPayButton;
