'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YooMoneyCheckoutWidget: any;
  }
}

export interface YooKassaPaymentResult {
  paymentId?: string;
  status?: string;
  paid?: boolean;
  amount?: {
    value: string;
    currency: string;
  };
}

interface YooKassaWidgetProps {
  confirmationToken: string;
  returnUrl?: string;
  onSuccess?: (result: YooKassaPaymentResult) => void;
  onError?: (error: any) => void;
  onClose?: () => void;
  modal?: boolean;
  customization?: {
    modal?: boolean;
    [key: string]: any;
  };
}

export default function YooKassaWidget({
  confirmationToken,
  returnUrl = typeof window !== 'undefined' ? window.location.origin + '/order/success' : '',
  onSuccess,
  onError,
  onClose,
  modal = false,
  customization,
}: YooKassaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callbacks через ref — не пересоздаём виджет на каждый re-render родителя.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);
  const customizationRef = useRef(customization);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onCloseRef.current = onClose;
  customizationRef.current = customization;

  useEffect(() => {
    if (!confirmationToken) {
      setError('Не указан токен подтверждения');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadWidget = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!window.YooMoneyCheckoutWidget) {
          const existingScript = document.getElementById('YooMoneyCheckoutWidget');
          if (!existingScript) {
            const script = document.createElement('script');
            script.id = 'YooMoneyCheckoutWidget';
            script.src = 'https://yookassa.ru/checkout-widget/v1/checkout-widget.js';
            script.charset = 'utf-8';
            script.async = true;

            await new Promise<void>((resolve, reject) => {
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('Не удалось загрузить виджет ЮKassa'));
              document.head.appendChild(script);
            });
          }

          let attempts = 0;
          const maxAttempts = 20;
          while (!window.YooMoneyCheckoutWidget && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          if (!window.YooMoneyCheckoutWidget) {
            throw new Error('Виджет ЮKassa не загрузился');
          }

          if (typeof window.YooMoneyCheckoutWidget !== 'function') {
            throw new Error('YooMoneyCheckoutWidget не является конструктором');
          }
        }

        if (cancelled) return;

        if (!modal) {
          let containerAttempts = 0;
          const maxContainerAttempts = 10;
          while (!containerRef.current && containerAttempts < maxContainerAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            containerAttempts++;
          }

          if (!containerRef.current) {
            throw new Error('Контейнер не найден');
          }
        }

        if (widgetRef.current) {
          try {
            widgetRef.current.destroy?.();
          } catch {
            // ignore
          }
          widgetRef.current = null;
        }

        if (cancelled) return;

        const custom = customizationRef.current;
        const config: any = {
          confirmation_token: confirmationToken,
          return_url: returnUrl,
          error_callback: (err: any) => {
            console.error('YooKassa Widget error:', err);
            setError(err?.message || 'Ошибка при обработке платежа');
            onErrorRef.current?.(err);
          },
        };

        if (custom || modal) {
          config.customization = {
            modal: modal || custom?.modal || false,
            ...custom,
          };
        }

        if (!window.YooMoneyCheckoutWidget || typeof window.YooMoneyCheckoutWidget !== 'function') {
          throw new Error('YooMoneyCheckoutWidget не доступен или не является конструктором');
        }

        widgetRef.current = new window.YooMoneyCheckoutWidget(config);

        const renderTarget = modal
          ? undefined
          : containerRef.current?.id || 'yookassa-widget-container';

        await widgetRef.current.render(renderTarget);
        if (cancelled) {
          try {
            widgetRef.current.destroy?.();
          } catch {
            // ignore
          }
          widgetRef.current = null;
          return;
        }

        setLoading(false);

        widgetRef.current.on('success', (result: YooKassaPaymentResult) => {
          onSuccessRef.current?.(result);
        });

        widgetRef.current.on('modal_close', () => {
          onCloseRef.current?.();
        });
      } catch (err: any) {
        if (cancelled) return;
        console.error('YooKassa Widget error:', err);
        setError(err.message || 'Ошибка загрузки виджета');
        setLoading(false);
      }
    };

    if (containerRef.current && !containerRef.current.id && !modal) {
      containerRef.current.id = `yookassa-widget-${confirmationToken.slice(0, 12)}`;
    }

    const timer = setTimeout(() => {
      void loadWidget();
    }, 100);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (widgetRef.current) {
        try {
          widgetRef.current.destroy?.();
        } catch {
          // ignore
        }
        widgetRef.current = null;
      }
    };
    // Только token/returnUrl/modal — не callbacks (через ref).
  }, [confirmationToken, returnUrl, modal]);

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '8px', color: '#666' }}>
            Не удалось загрузить виджет ЮKassa
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (modal) {
    return null;
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div
        ref={containerRef}
        style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          background: 'white',
          minHeight: '400px',
          position: 'relative',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.8)',
              zIndex: 10,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '8px' }}>Загрузка формы оплаты ЮKassa...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
