import React, { useState, useEffect } from 'react';
import styles from './OrderLeftPart.module.scss';
import Input from '@/components/text-field/input/Input';
import goBack from '@/assets/icons/go-back.svg';
import Karta from '@/assets/icons/Karta.svg';
import SberPay from '@/assets/icons/SberPay.svg';
import SBP from '@/assets/icons/SBP.svg';
import Miraflores_logo from '@/assets/icons/Miraflores_logo.svg';
import krem from '@/assets/images/krem.webp';

import CustomCheckbox from '@/components/custom-checkBox/CustomCheckbox';
import CustomButton from '@/components/custom-button/CustomButton';
import PaymentsList from '../order-components/PaymentsList';
import DeliveryProfile from '@/components/delivary-profile/DeliveryProfile';
import TotalAccordion from '../total-accardion/TotalAccardion';
import YooKassaWidget from '@/components/yookassa/YooKassaWidget';

import { useScreenMatch } from '@/hooks/useScreenMatch';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { AddressInfo } from '@/types/auth';
import { formatPhoneNumber } from '@/utils/phoneFormatter';


// 1. Define the shape of your form data
interface OrderFormData {
  name: string;
  email: string;
  phone: string;
  isSubscribed: boolean;
}

const OrderLeftPart: React.FC = () => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const isMobile = useScreenMatch(500);

  // 2. Consolidated State (Cleaner hooks)
  const [formData, setFormData] = useState<OrderFormData>({
    name: '',
    email: '',
    phone: '',
    isSubscribed: true,
  });

  // Separate state for the complex Address object
  const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null);
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

  // 3. One Effect to sync Redux data to Inputs
  useEffect(() => {
    if (me) {
      const fullName = `${me.firstName || ''} ${me.lastName || ''}`.trim();
      const userEmail = me.email || '';

      // Всегда обновляем имя и email из данных пользователя
      setFormData((prev) => ({
        ...prev,
        name: fullName || '',
        email: userEmail || '',
      }));

      // Автозаполнение телефона из адреса по умолчанию или из метаданных
      let phone = '';
      if (me.addresses && me.addresses.length > 0) {
        const defaultAddress = me.addresses.find(a => a.isDefaultShippingAddress) ||
          me.addresses.find(a => a.isDefaultBillingAddress) ||
          me.addresses[0];

        if (defaultAddress?.phone) {
          phone = defaultAddress.phone;
        }
      }

      // Если в адресе нет телефона, ищем в metadata
      if (!phone && me.metadata) {
        const phoneMeta = me.metadata.find(m => m.key === 'phone');
        if (phoneMeta?.value) {
          phone = phoneMeta.value;
        }
      }

      if (phone) {
        setFormData((prev) => ({
          ...prev,
          phone: formatPhoneNumber(phone) || prev.phone
        }));
      }
    }
  }, [me]);


  // 4. Generic Change Handler
  const handleInputChange = (field: keyof OrderFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 5. Intelligent Address Selection
  const handleAddressSelect = (address: AddressInfo) => {
    setSelectedAddress(address);

    // Auto-fill phone from address
    if (address?.phone) {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhoneNumber(address.phone) || prev.phone
      }));
    }

  };

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

      // Вычисляем общую сумму
      const totalAmount = lines.reduce((sum: number, line: any) => {
        return sum + (line.price * line.quantity);
      }, 0) - (voucherDiscount || 0);

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

  const paymentImages = [
    { src: SBP, alt: 'goSBPBack' },
    { src: Karta, alt: 'Karta' },
    { src: SberPay, alt: 'SberPay' },
  ];

  const products = [
    {
      id: 1,
      name: 'Цветочный мист с экстрактами розы',
      size: '50 мл',
      price: 3590,
      oldPrice: 4800,
      discount: '-23%',
      image: krem,
    },
    // ... items
  ];

  return (
    <section className={styles.left}>
      {/* Navigation & Header Logic */}
      {!isMobile && (
        <img
          src={goBack}
          alt='goBack'
          onClick={() => history.back()}
          className={styles.goBack}
        />
      )}

      {isMobile && (
        <section className={styles.mobileHeaderContainer}>
          <div className={styles.mobileHeader}>
            <img src={goBack} alt='goBack' className={styles.goBackMobile} />
            <div className={styles.logoWrapper}>
              <img src={Miraflores_logo} alt='Miraflores_logo' className={styles.Miraflores_logo} />
            </div>
          </div>
        </section>
      )}

      {isMobile && (
        <section>
          <TotalAccordion
            total={13590}
            totalOld={24800}
            products={products}
            discount={800}
            promo={1000}
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

      <section className={styles.paymentWrapper}>
        <p className={styles.paymentTitle}>Оплата</p>
        <article className={styles.payments}>
          <PaymentsList paymentImages={paymentImages} />
        </article>
      </section>

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
            disabled={isCreatingPayment || showYooKassaWidget}
          />
        </figure>
        <p className={styles.agreement}>
          Нажимая на кнопку «Оформить заказ», я соглашаюсь с условиями <span>Публичной оферты</span>{' '}
          и выражаю своё согласие на обработку моих персональных данных в соответствии с{' '}
          <span>Политикой конфиденциальности</span>
        </p>
      </section>
    </section>
  );
};

export default OrderLeftPart;