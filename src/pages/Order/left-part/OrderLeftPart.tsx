import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './OrderLeftPart.module.scss';
import Input from '@/components/text-field/input/Input';
import goBack from '@/assets/icons/go-back.svg';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import krem from '@/assets/images/Cream.png';

import CustomButton from '@/components/custom-button/CustomButton';
import DeliveryProfile from '@/components/delivery-profile/DeliveryProfile';
import TotalAccordion from '../total-accordion/TotalAccordion';
import Certificate from '../order-components/Certificate';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store/store';
import { AddressInfo } from '@/types/auth';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { useOrderCheckout } from '../OrderCheckoutContext';
import { createOrder, payOrder, abandonOrder, requestShippingQuote } from '@/api/ordersApi';
import { getOrCreateGuestId } from '@/api/apiClient';
import { resolveCheckoutShippingMethod } from '@/utils/checkoutShipping';
import { extractPvzCodeFromStreet2 } from '@/lib/addressVspMeta';
import { syncCartLines } from '@/store/slices/checkoutSlice';
import { AppDispatch } from '@/store/store';
import { useToast } from '@/components/toast/toast';
import { useApplicableGift } from '@/hooks/useApplicableGift';
import { calcCartSubtotal } from '@/utils/freePvzShipping';
import {
  buildCheckoutFingerprint,
  buildOrderSuccessReturnUrl,
  clearPendingCheckoutOrder,
  readPendingCheckoutOrder,
  writePendingCheckoutOrder,
} from '@/utils/pendingCheckoutOrder';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function normalizePhoneDigits(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('8')) {
    d = `7${d.slice(1)}`;
  }
  return d;
}

/** Согласовано с Nest `isValidPhone`: 10–15 цифр; RU 11 с 7 или 10 локальных. */
function isValidRuPhone(raw: string): boolean {
  const d = normalizePhoneDigits(raw);
  if (d.length < 10 || d.length > 15) return false;
  if (d.length === 11 && d.startsWith('7')) return true;
  if (d.length === 10) return true;
  return d.length >= 10 && d.length <= 15;
}

interface OrderFormData {
  name: string;
  email: string;
  phone: string;
  comment: string;
}

const COMMENT_MAX = 1000;

const OrderLeftPart: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch();

  const [formData, setFormData] = useState<OrderFormData>({
    name: '',
    email: '',
    phone: '',
    comment: '',
  });
  const [commentFocused, setCommentFocused] = useState(false);

  const {
    selectedAddress,
    applySavedAddress,
    setCheckoutEmail,
    cdekShippingRub,
    cdekShippingLoading,
    cdekShippingError,
    shippingQuoteMeta,
    freePvzShippingApplied,
    payable,
  } = useOrderCheckout();
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [showYooKassaWidget, setShowYooKassaWidget] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  /** Сумма с Nest после create/pay — CTA, если разошлась с client payableTotal. */
  const [chargedTotal, setChargedTotal] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    general?: string;
  }>({});
  const { lines } = useSelector((state: RootState) => state.checkout);
  const { voucherCode, voucherKind } = useSelector((state: RootState) => state.checkout);
  const dispatch = useDispatch<AppDispatch>();
  const giftSubtotal = React.useMemo(() => calcCartSubtotal(lines || []), [lines]);
  const giftLine = useApplicableGift(giftSubtotal);

  /** Один раз подставляем ФИО/email/телефон из профиля. После смены ПВЗ вызывается getMe() — без этого снова затирало вручную введённые поля. */
  const didHydrateFormFromMeRef = useRef(false);

  useEffect(() => {
    if (!me || didHydrateFormFromMeRef.current) return;
    didHydrateFormFromMeRef.current = true;

    const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim();
    const userEmail = me.email || '';

    let phone = '';
    if (me.addresses && me.addresses.length > 0) {
      const defaultAddress =
        me.addresses.find(a => a.isDefaultShippingAddress) ||
        me.addresses.find(a => a.isDefaultBillingAddress) ||
        me.addresses[0];

      if (defaultAddress?.phone) {
        phone = defaultAddress.phone;
      }
    }

    if (!phone && me.metadata) {
      const phoneMeta = me.metadata.find(m => m.key === 'phone');
      if (phoneMeta?.value) {
        phone = phoneMeta.value;
      }
    }

    setFormData((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : fullName || prev.name,
      email: prev.email.trim() ? prev.email : userEmail || prev.email,
      phone: prev.phone.trim()
        ? prev.phone
        : phone
          ? formatPhoneNumber(phone) || prev.phone
          : prev.phone,
    }));
  }, [me, setCheckoutEmail]);

  useEffect(() => {
    setCheckoutEmail(formData.email);
  }, [formData.email, setCheckoutEmail]);

  const handleInputChange = (field: keyof OrderFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = useCallback((address: AddressInfo) => {
    if (!applySavedAddress(address)) {
      return;
    }

    setValidationErrors((prev) =>
      prev.address ? { ...prev, address: undefined, general: undefined } : prev,
    );

    if (address?.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhoneNumber(address.phone) || prev.phone,
      }));
    }
  }, [applySavedAddress]);

  const handlePayment = async () => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      general?: string;
    } = {};

    if (!formData.name.trim()) {
      errors.name = 'Укажите имя и фамилию';
    }

    const emailTrimmed = formData.email.trim();
    if (!emailTrimmed) {
      errors.email = 'Укажите email';
    } else if (!EMAIL_RE.test(emailTrimmed)) {
      errors.email = 'Некорректный email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Укажите телефон';
    } else if (!isValidRuPhone(formData.phone)) {
      errors.phone = 'Телефон в формате +7…';
    }

    if (!selectedAddress) {
      errors.address = 'Выберите или добавьте адрес доставки';
    } else if (payable.hasPayableLines) {
      const shippingMethod = resolveCheckoutShippingMethod(selectedAddress.streetAddress2);
      if (!shippingMethod) {
        errors.address = 'Выберите адрес со способом доставки (СДЭК или Яндекс Доставка)';
      } else if (cdekShippingLoading) {
        errors.general = 'Подождите, рассчитывается стоимость доставки';
      } else if (!payable.shippingReady || payable.shippingRub == null || payable.payableTotal == null) {
        errors.address =
          cdekShippingError ||
          'Не удалось рассчитать доставку. Укажите корректный индекс и способ доставки.';
      }
    }

    if (Object.keys(errors).length > 0) {
      const general =
        errors.general ||
        errors.address ||
        [errors.name, errors.email, errors.phone].filter(Boolean).join('. ') ||
        'Заполните обязательные поля';
      setValidationErrors({ ...errors, general });
      toast.error(general);
      requestAnimationFrame(() => {
        const first =
          document.querySelector<HTMLElement>('[data-checkout-field="address"].hasError') ||
          document.querySelector<HTMLElement>('[aria-invalid="true"]');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (first?.tagName === 'INPUT') first.focus();
        else first?.querySelector<HTMLElement>('input, button')?.focus();
      });
      return;
    }

    setValidationErrors({});

    if (!selectedAddress) {
      return;
    }

    if (lines.length === 0) {
      toast.error('Корзина пуста');
      navigate('/', { replace: true });
      return;
    }

    /** Один итог с summary/CTA: Nest order.total ≈ payableTotal. */
    const shippingAmount = payable.hasPayableLines ? (payable.shippingRub ?? 0) : 0;
    const shippingMethod = resolveCheckoutShippingMethod(selectedAddress.streetAddress2);
    if (!shippingMethod) {
      toast.error('Выберите адрес со способом доставки (СДЭК или Яндекс Доставка)');
      return;
    }

    const phoneDigits = normalizePhoneDigits(formData.phone);
    const phoneE164 = `+${phoneDigits}`;

    setIsCreatingPayment(true);
    try {
      const syncResult = await dispatch(syncCartLines()).unwrap();
      if (syncResult.removed?.length) {
        toast.error(
          `Часть товаров недоступна и убрана из корзины (${syncResult.removed.length}). Проверьте корзину и попробуйте снова.`,
        );
        return;
      }
      if (!(syncResult.lines?.length > 0)) {
        toast.error('Корзина пуста');
        return;
      }

      const orderLines = syncResult.lines
        .filter((l: { isGift?: boolean }) => !l.isGift)
        .map((line: { variantId: string; quantity: number }) => ({
          variantId: line.variantId,
          qty: line.quantity,
        }));

      const recipientName = [selectedAddress.firstName, selectedAddress.lastName]
        .map((x) => (x || '').trim())
        .filter(Boolean)
        .join(' ');
      const shippingAddress = {
        city: selectedAddress.city,
        address: selectedAddress.streetAddress1,
        apartment: selectedAddress.apartment || undefined,
        region: selectedAddress.countryArea || undefined,
        district: selectedAddress.cityArea || undefined,
        postalCode: selectedAddress.postalCode || undefined,
        comment: selectedAddress.streetAddress2 || undefined,
        pvzCode: extractPvzCodeFromStreet2(selectedAddress.streetAddress2),
        phone: selectedAddress.phone?.trim() || undefined,
        recipientName: recipientName || undefined,
        ...(shippingQuoteMeta
          ? {
              carrierQuote: {
                tariffId: shippingQuoteMeta.tariffId ?? null,
                tariffName: shippingQuoteMeta.tariffName ?? null,
                daysMin: shippingQuoteMeta.daysMin ?? null,
                daysMax: shippingQuoteMeta.daysMax ?? null,
                cost: shippingAmount,
                method: shippingMethod,
                source: 'client_estimate',
              },
            }
          : {}),
      };

      const promoCode = voucherKind === 'gift' ? null : voucherCode || null;
      const giftCertificateCode = voucherKind === 'gift' ? voucherCode || null : null;

      const customerNote = formData.comment.trim().slice(0, COMMENT_MAX) || null;

      const fingerprint = buildCheckoutFingerprint({
        lines: orderLines,
        email: emailTrimmed,
        phone: phoneE164,
        customerName: formData.name.trim(),
        customerNote,
        shippingMethod,
        shippingAddress,
        promoCode,
        giftCertificateCode,
        shippingCost: shippingAmount,
        // Не шлём gift в lines — Nest create аттачит через getApplicableGift.
        // В fingerprint — чтобы не reuse pending-заказа, созданного без подарка.
        gratitudeGiftVariantId: giftLine?.variantId ?? null,
      });

      const openPayWidget = async (orderId: string, orderNumber: string, payToken: string) => {
        const payResult = await payOrder(orderId, payToken);

        if (payResult.alreadyPaid) {
          window.location.href = buildOrderSuccessReturnUrl({
            orderId,
            orderNumber,
          });
          return;
        }

        if (typeof payResult.total === 'number' && Number.isFinite(payResult.total)) {
          const serverTotal = Math.round(payResult.total);
          const clientTotal =
            payable.payableTotal != null ? Math.round(payable.payableTotal) : null;
          setChargedTotal(serverTotal);
          if (clientTotal != null && serverTotal !== clientTotal) {
            toast.warning(
              `Сумма к оплате уточнена: ${serverTotal.toLocaleString('ru-RU')}₽`,
            );
          }
        }

        const existing = readPendingCheckoutOrder();
        writePendingCheckoutOrder({
          orderId,
          orderNumber,
          payToken,
          idempotencyKey:
            existing?.idempotencyKey ||
            (typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `ik-${Date.now()}`),
          fingerprint,
          paymentId: payResult.paymentId ?? null,
        });

        if (payResult.confirmationToken) {
          setConfirmationToken(payResult.confirmationToken);
          setShowYooKassaWidget(true);
        } else {
          throw new Error('No confirmation token received');
        }
      };

      const pending = readPendingCheckoutOrder();
      if (pending && pending.fingerprint === fingerprint) {
        try {
          await openPayWidget(pending.orderId, pending.orderNumber, pending.payToken);
          return;
        } catch (reuseErr) {
          console.warn('Pending order pay reuse failed, creating a new order', reuseErr);
          try {
            await abandonOrder(pending.orderId, pending.payToken);
          } catch {
            // ignore
          }
          clearPendingCheckoutOrder();
        }
      } else if (pending && pending.fingerprint !== fingerprint) {
        try {
          await abandonOrder(pending.orderId, pending.payToken);
        } catch {
          // ignore
        }
        clearPendingCheckoutOrder();
      }

      const quoteRes = await requestShippingQuote({
        lines: orderLines,
        shippingAddress,
        shippingMethod,
        clientEstimate: shippingAmount,
        ...(shippingAddress.carrierQuote
          ? { carrierQuote: shippingAddress.carrierQuote }
          : {}),
      });

      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `ik-${Date.now()}`;

      const order = await createOrder({
        lines: orderLines,
        email: emailTrimmed,
        phone: phoneE164,
        customerName: formData.name.trim(),
        customerNote,
        guestId: getOrCreateGuestId(),
        idempotencyKey,
        promoCode,
        giftCertificateCode,
        shippingQuote: quoteRes.quote,
        shippingMethod: quoteRes.method,
        shippingAddress,
      });

      if (!order.payToken) {
        throw new Error('Сервер не вернул payToken');
      }

      if (
        giftLine?.variantId &&
        !(order.items || []).some((i) => i.isGratitudeGift && i.variantId === giftLine.variantId)
      ) {
        // Nest soft-skip при OOS — не блокируем оплату.
        toast.warning(
          'Подарок благодарности временно недоступен — оформляем заказ без него',
        );
      }

      writePendingCheckoutOrder({
        orderId: order.id,
        orderNumber: order.number,
        payToken: order.payToken,
        idempotencyKey,
        fingerprint,
      });

      await openPayWidget(order.id, order.number, order.payToken);
    } catch (error: unknown) {
      console.error('Error creating payment:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Ошибка создания платежа. Пожалуйста, попробуйте позже.',
      );
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const yooKassaReturnUrl = React.useMemo(() => {
    if (!confirmationToken || typeof window === 'undefined') return '';
    return buildOrderSuccessReturnUrl();
  }, [confirmationToken]);

  const handleYooKassaSuccess = useCallback(() => {
    window.location.href = buildOrderSuccessReturnUrl();
  }, []);

  const handleYooKassaError = useCallback(
    (error: { message?: string }) => {
      console.error('Payment error:', error);
      toast.error(
        'Ошибка при обработке платежа: ' + (error.message || 'Неизвестная ошибка'),
      );
    },
    [toast],
  );

  /**
   * Закрытие виджета / «Оплатить позже»: soft-keep pending с тем же fingerprint.
   * Повторный CTA → pay reuse без re-quote/create. Abandon только при смене
   * fingerprint или failed reuse (см. handlePayment).
   */
  const handleYooKassaClose = useCallback(() => {
    setConfirmationToken(null);
    setShowYooKassaWidget(false);
  }, []);

  // Сброс server charge, если клиентский итог изменился (корзина / доставка / промо).
  useEffect(() => {
    setChargedTotal(null);
  }, [payable.payableTotal]);

  const mobileAccordionData = React.useMemo(() => {
    const safeLines = lines || [];

    const products = safeLines.map((line: any) => {
      const price = Number(line.price ?? 0) || 0;
      const old = Number(line.oldPrice ?? 0) || 0;
      const discountLabel =
        old > price && old > 0 ? `-${Math.round(((old - price) / old) * 100)}%` : undefined;
      return {
        id: line.variantId,
        name: line.title || 'Товар',
        size: line.size || '',
        price,
        oldPrice: old > price ? old : undefined,
        discount: discountLabel,
        image: line.thumbnail || krem,
        isGift: Boolean(line.isGift),
        quantity: Number(line.quantity ?? 1) || 1,
      };
    });

    if (giftLine) {
      products.push({
        id: `${giftLine.variantId}:gift`,
        name: giftLine.title,
        size: '',
        price: 0,
        oldPrice: undefined,
        discount: undefined,
        image: giftLine.thumbnail || krem,
        isGift: true,
        quantity: giftLine.quantity,
      });
    }

    return {
      totalItems: payable.totalItems + (giftLine ? giftLine.quantity : 0),
      finalTotal: payable.payableTotal,
      goodsTotal: payable.goodsTotal,
      totalOldPrice: payable.totalOldPrice,
      totalDiscount: payable.catalogDiscount,
      promo: payable.voucherDiscount,
      products,
      hasPayableLines: payable.hasPayableLines,
      shippingReady: payable.shippingReady,
    };
  }, [lines, payable, giftLine]);

  const payLabel = React.useMemo(() => {
    if (isCreatingPayment) return 'Создание платежа...';
    if (payable.hasPayableLines && !payable.shippingReady) {
      return 'Оформить и оплатить';
    }
    const displayTotal = chargedTotal ?? payable.payableTotal;
    if (displayTotal == null) {
      return 'Оформить и оплатить';
    }
    const amount = Math.round(displayTotal).toLocaleString('ru-RU');
    return `Оформить и оплатить · ${amount}₽`;
  }, [isCreatingPayment, payable, chargedTotal]);

  const payDisabled =
    isCreatingPayment ||
    showYooKassaWidget ||
    (payable.hasPayableLines &&
      (cdekShippingLoading || !payable.shippingReady || payable.payableTotal == null));

  return (
    <section className={styles.left}>
      {!isMobile && (
        <button
          type="button"
          className={styles.goBack}
          aria-label="Назад"
          onClick={() => navigate(-1)}
        >
          <img src={goBack} alt="" />
        </button>
      )}

      {isMobile && (
        <section className={styles.mobileHeaderContainer}>
          <div className={styles.mobileHeader}>
            <button
              type="button"
              className={styles.goBackBtn}
              aria-label="Назад"
              onClick={() => navigate(-1)}
            >
              <img src={goBack} alt='' className={styles.goBackMobile} />
            </button>
            <div className={styles.logoWrapper}>
              <Link to="/" aria-label="На главную">
                <img
                  src={siteLogo}
                  alt='Miraflores'
                  className={styles.Miraflores_logo}
                  width={128}
                  height={14}
                  decoding="async"
                />
              </Link>
            </div>
            <div className={styles.headerSpacer} aria-hidden />
          </div>
        </section>
      )}

      {isMobile && (
        <section>
          <Certificate />
          <TotalAccordion
            total={mobileAccordionData.finalTotal}
            goodsTotal={mobileAccordionData.goodsTotal}
            totalOld={mobileAccordionData.totalOldPrice}
            totalItems={mobileAccordionData.totalItems}
            products={mobileAccordionData.products}
            discount={mobileAccordionData.totalDiscount}
            promo={mobileAccordionData.promo}
            shippingRub={cdekShippingRub ?? null}
            shippingLoading={cdekShippingLoading}
            shippingError={cdekShippingError ?? null}
            freePvzShippingApplied={freePvzShippingApplied}
            addressSelected={Boolean(selectedAddress)}
            hasPayableLines={mobileAccordionData.hasPayableLines}
          />
        </section>
      )}

      <section className={styles.inputWrapper}>
        <Input
          value={formData.name}
          label="Имя Фамилия"
          required
          data-checkout-field="name"
          onChange={(e) => {
            handleInputChange('name', e.target.value);
            if (validationErrors.name) {
              setValidationErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          type='text'
          error={validationErrors.name}
        />
        <Input
          value={formData.email}
          label="Email"
          required
          data-checkout-field="email"
          onChange={(e) => {
            handleInputChange('email', e.target.value);
            if (validationErrors.email) {
              setValidationErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          type='email'
          error={validationErrors.email}
        />
      </section>

      <section>
        <DeliveryProfile
          onSelectAddress={handleAddressSelect}
          hasError={Boolean(validationErrors.address)}
          errorMessage={validationErrors.address}
        />
      </section>

      <section className={styles.phoneWrapper}>
        <Input
          value={formData.phone}
          required
          label="Телефон"
          data-checkout-field="phone"
          error={validationErrors.phone}
          onChange={(e) => {
            if (validationErrors.phone) {
              setValidationErrors((prev) => ({ ...prev, phone: undefined }));
            }
            const formatted = formatPhoneNumber(e.target.value);
            handleInputChange('phone', formatted);
          }}
          type='text'
        />
      </section>

      <section className={styles.commentWrapper}>
        <div
          className={[
            styles.commentField,
            commentFocused ? styles.commentFieldFocused : '',
            formData.comment.trim() ? styles.commentFieldActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <label className={styles.commentLabel} htmlFor="checkout-order-comment">
            Комментарий к заказу
          </label>
          <textarea
            id="checkout-order-comment"
            className={styles.commentTextarea}
            data-checkout-field="comment"
            value={formData.comment}
            maxLength={COMMENT_MAX}
            rows={3}
            onFocus={() => setCommentFocused(true)}
            onBlur={() => setCommentFocused(false)}
            onChange={(e) =>
              handleInputChange('comment', e.target.value.slice(0, COMMENT_MAX))
            }
          />
        </div>
      </section>

      {showYooKassaWidget && confirmationToken && (
        <div style={{ marginBottom: '24px' }}>
          <YooKassaWidget
            confirmationToken={confirmationToken}
            returnUrl={yooKassaReturnUrl}
            onSuccess={handleYooKassaSuccess}
            onError={handleYooKassaError}
            onClose={() => {
              handleYooKassaClose();
            }}
          />
          <button
            type="button"
            className={styles.agreement}
            style={{
              display: 'block',
              marginTop: 12,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              color: 'inherit',
            }}
            onClick={() => {
              handleYooKassaClose();
            }}
          >
            Оплатить позже
          </button>
        </div>
      )}

      <section className={styles.orderButtonWrapper}>
        <figure className={styles.orderButton}>
          {validationErrors.general && (
            <p className={styles.validationError}>{validationErrors.general}</p>
          )}
          <CustomButton
            label={payLabel}
            onClick={handlePayment}
            disabled={payDisabled}
          />
        </figure>
        <p className={styles.agreement}>
          Нажимая на кнопку «Оформить и оплатить», я соглашаюсь с условиями{' '}
          <Link to="/info/oferta-i-usloviia-polzovaniia">Публичной оферты</Link>{' '}
          и выражаю своё согласие на обработку моих персональных данных в соответствии с{' '}
          <Link to="/info/politika-konfidentsialnosti">Политикой конфиденциальности</Link>
        </p>
      </section>
    </section>
  );
};

export default OrderLeftPart;
