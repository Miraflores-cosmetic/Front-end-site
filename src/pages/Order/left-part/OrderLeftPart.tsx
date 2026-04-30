import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './OrderLeftPart.module.scss';
import Input from '@/components/text-field/input/Input';
import goBack from '@/assets/icons/go-back.svg';
import siteLogo from '@/assets/icons/Logo-mira.svg';
import krem from '@/assets/images/Cream.png';

import CustomCheckbox from '@/components/custom-checkBox/CustomCheckbox';
import CustomButton from '@/components/custom-button/CustomButton';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import TotalAccordion from '../total-accardion/TotalAccardion';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { AddressInfo } from '@/types/auth';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { useOrderCheckout } from '../OrderCheckoutContext';


// 1. Define the shape of your form data
interface OrderFormData {
  name: string;
  email: string;
  phone: string;
  isSubscribed: boolean;
}

const OrderLeftPart: React.FC = () => {
  const navigate = useNavigate();
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch();

  // 2. Consolidated State (Cleaner hooks)
  const [formData, setFormData] = useState<OrderFormData>({
    name: '',
    email: '',
    phone: '',
    isSubscribed: true,
  });

  const {
    selectedAddress,
    setSelectedAddress,
    cdekShippingRub,
    cdekShippingLoading,
    cdekShippingError,
  } = useOrderCheckout();
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [showYooKassaWidget, setShowYooKassaWidget] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: boolean;
    email?: boolean;
    phone?: boolean;
    general?: string;
  }>({});
  const { lines } = useSelector((state: RootState) => state.checkout);
  const { voucherDiscount } = useSelector((state: RootState) => state.checkout);

  /** Один раз подставляем ФИО/email/телефон из профиля. После смены ПВЗ вызывается getMe() — без этого снова затирало вручную введённые поля. */
  const didHydrateFormFromMeRef = useRef(false);

  // 3. Один раз подставляем данные из профиля в пустые поля (не затираем уже введённое; не трогаем форму при повторных getMe после смены ПВЗ)
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
  }, [me]);


  // 4. Generic Change Handler
  const handleInputChange = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = useCallback((address: AddressInfo) => {
    setSelectedAddress(address);

    if (address?.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhoneNumber(address.phone) || prev.phone,
      }));
    }
  }, [setSelectedAddress]);

  const handlePayment = async () => {
    if (!selectedAddress) {
      alert('Пожалуйста, выберите адрес доставки');
      return;
    }

    const errors: any = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.email.trim()) errors.email = true;
    if (!formData.phone.trim()) errors.phone = true;

    if (Object.keys(errors).length > 0) {
      setValidationErrors({
        ...errors,
        general: 'Заполните все поля'
      });
      return;
    }

    setValidationErrors({});

    if (lines.length === 0) {
      alert('Корзина пуста');
      return;
    }

    const payableLines = lines.filter((line: { isGift?: boolean }) => !line.isGift);
    if (payableLines.length > 0) {
      if (cdekShippingLoading) {
        alert('Подождите, рассчитывается стоимость доставки');
        return;
      }
      if (cdekShippingRub == null) {
        alert(
          cdekShippingError ||
            'Не удалось рассчитать доставку. Укажите корректный индекс в адресе доставки.',
        );
        return;
      }
    }

    const shippingAmount = payableLines.length > 0 ? cdekShippingRub ?? 0 : 0;

    setIsCreatingPayment(true);
    try {
      // 1. Создаем checkout через REST API
      const checkoutResponse = await fetch('/api/checkout/create-without-stock-check/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'miraflores-site',
          email: formData.email,
          lines: lines.map((line: any) => ({
            variantId: line.variantId,
            quantity: line.quantity,
          })),
        }),
      });

      const checkoutResult = await checkoutResponse.json();

      if (!checkoutResponse.ok || !checkoutResult.success) {
        throw new Error(checkoutResult.error || 'Failed to create checkout');
      }

      const checkoutId = checkoutResult.checkout.token || checkoutResult.checkout.id;
      console.log('Checkout created:', checkoutId);

      // Сохраняем checkoutId в localStorage для использования на странице success
      localStorage.setItem('pendingCheckoutId', checkoutId);

      const totalAmount =
        lines.reduce((sum: number, line: any) => sum + line.price * line.quantity, 0) -
        (voucherDiscount || 0) +
        shippingAmount;

      // Создаем описание заказа
      const description = `Заказ - ${lines.length} товар(ов)`;

      // 2. Вызываем API для создания платежа
      const paymentResponse = await fetch('/api/yookassa/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.max(0, totalAmount),
          currency: 'RUB',
          description: description,
          orderId: checkoutId,
          returnUrl: `${window.location.origin}/order/success`,
          metadata: {
            userEmail: formData.email,
            userName: formData.name,
            userPhone: formData.phone,
            itemsCount: lines.length,
            checkoutId: checkoutId,
          },
        }),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(paymentResult.error || 'Failed to create payment');
      }

      if (paymentResult.confirmationToken) {
        setConfirmationToken(paymentResult.confirmationToken);
        setShowYooKassaWidget(true);
      } else {
        throw new Error('No confirmation token received');
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.message || 'Ошибка создания платежа. Пожалуйста, попробуйте позже.');
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const mobileAccordionData = React.useMemo(() => {
    const safeLines = lines || [];

    let totalItems = 0;
    let totalPrice = 0;
    let totalOldPrice = 0;

    safeLines.forEach((line: any) => {
      const q = Number(line.quantity ?? 0) || 0;
      const price = Number(line.price ?? 0) || 0;
      const old = Number(line.oldPrice ?? 0) || 0;

      totalItems += q;
      totalPrice += price * q;
      totalOldPrice += (old > price ? old : price) * q;
    });

    const totalDiscount = Math.max(0, totalOldPrice - totalPrice);
    const promo = voucherDiscount || 0;

    const hasPayableLines = safeLines.some((line: any) => !line.isGift);
    const shippingIncluded =
      hasPayableLines && !cdekShippingLoading && (cdekShippingRub ?? null) != null && !cdekShippingError;
    const shippingAmount = shippingIncluded ? (cdekShippingRub ?? 0) : 0;

    const finalTotal = Math.max(0, totalPrice - promo + shippingAmount);

    const products = safeLines.map((line: any, idx: number) => {
      const price = Number(line.price ?? 0) || 0;
      const old = Number(line.oldPrice ?? 0) || 0;
      const discountLabel =
        old > price && old > 0 ? `-${Math.round(((old - price) / old) * 100)}%` : undefined;

      return {
        id: idx + 1,
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

    return {
      totalItems,
      finalTotal,
      totalOldPrice,
      totalDiscount,
      promo,
      products,
      hasPayableLines,
    };
  }, [lines, voucherDiscount, cdekShippingRub, cdekShippingLoading, cdekShippingError]);

  return (
    <section className={styles.left}>
      {/* Navigation & Header Logic */}
      {!isMobile && (
        <img
          src={goBack}
          alt='goBack'
          onClick={() => navigate(-1)}
          className={styles.goBack}
        />
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
                <img src={siteLogo} alt='Miraflores' className={styles.Miraflores_logo} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {isMobile && (
        <section>
          <TotalAccordion
            total={mobileAccordionData.finalTotal}
            totalOld={mobileAccordionData.totalOldPrice}
            totalItems={mobileAccordionData.totalItems}
            products={mobileAccordionData.products}
            discount={mobileAccordionData.totalDiscount}
            promo={mobileAccordionData.promo}
            shippingRub={cdekShippingRub ?? null}
            shippingLoading={cdekShippingLoading}
            shippingError={cdekShippingError ?? null}
            addressSelected={Boolean(selectedAddress)}
            hasPayableLines={mobileAccordionData.hasPayableLines}
          />
        </section>
      )}

      {/* --- Refactored Inputs Section --- */}
      <section className={styles.inputWrapper}>
        <Input
          value={formData.name}
          label="Имя Фамилия"
          required
          onChange={(e) => {
            handleInputChange('name', e.target.value);
            if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: false }));
          }}
          type='text'
          placeholder='Имя Фамилия'
          error={validationErrors.name}
        />
        <Input
          value={formData.email}
          label="Email"
          required
          onChange={(e) => {
            handleInputChange('email', e.target.value);
            if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: false }));
          }}
          type='email'
          placeholder='Email'
          error={validationErrors.email}
        />
      </section>

      <section>
        <DeliveryProfile onSelectAddress={handleAddressSelect} />
      </section>

      <section className={styles.phoneWrapper}>
        <Input
          value={formData.phone}
          required
          label="Телефон"
          error={validationErrors.phone}
          onChange={(e) => {
            if (validationErrors.phone) setValidationErrors(prev => ({ ...prev, phone: false }));
            const formatted = formatPhoneNumber(e.target.value);
            handleInputChange('phone', formatted);
          }}

          type='text'
          placeholder='+7 (999) 999-99-99'
        />
      </section>

      {!isMobile && (
        <section className={styles.checkWrapper}>
          <CustomCheckbox
            checked={formData.isSubscribed}
            onChange={(val) => handleInputChange('isSubscribed', val)}
          />
          <label>Пишите мне о распродажах, скидках и новых поступлениях</label>
        </section>
      )}

      {/* Виджет ЮKassa - показывается когда доступен confirmation_token */}
      {showYooKassaWidget && confirmationToken && (
        <div style={{ marginBottom: '24px' }}>
          <YooKassaWidget
            confirmationToken={confirmationToken}
            returnUrl={`${window.location.origin}/order/success`}
            onSuccess={(result) => {
              console.log('Payment successful:', result);
              window.location.href = '/order/success';
            }}
            onError={(error) => {
              console.error('Payment error:', error);
              alert('Ошибка при обработке платежа: ' + (error.message || 'Неизвестная ошибка'));
            }}
            onClose={() => setShowYooKassaWidget(false)}
          />
        </div>
      )}

      <section className={styles.orderButtonWrapper}>
        <figure className={styles.orderButton}>
          {validationErrors.general && (
            <p className={styles.validationError}>{validationErrors.general}</p>
          )}
          <CustomButton
            label={isCreatingPayment ? 'Создание платежа...' : 'Оплатить'}
            onClick={handlePayment}
            disabled={
              isCreatingPayment ||
              showYooKassaWidget ||
              (lines.some((l: { isGift?: boolean }) => !l.isGift) && cdekShippingLoading)
            }
          />
        </figure>
        <p className={styles.agreement}>
          Нажимая на кнопку «Оформить заказ», я соглашаюсь с условиями{' '}
          <Link to="/info/oferta-i-usloviia-polzovaniia">Публичной оферты</Link>{' '}
          и выражаю своё согласие на обработку моих персональных данных в соответствии с{' '}
          <Link to="/info/politika-konfidentsialnosti">Политикой конфиденциальности</Link>
        </p>
      </section>
    </section>
  );
};

export default OrderLeftPart;