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
      
      // Автозаполнение телефона из адреса по умолчанию
      if (me.addresses && me.addresses.length > 0) {
        const defaultAddress = me.addresses.find(a => a.isDefaultShippingAddress) || 
                              me.addresses.find(a => a.isDefaultBillingAddress) || 
                              me.addresses[0];
        if (defaultAddress?.phone) {
          setFormData((prev) => ({
            ...prev,
            phone: defaultAddress.phone || prev.phone
          }));
        }
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
        phone: address.phone || prev.phone
      }));
    }
  };

  const handlePayment = async () => {
    if (!selectedAddress) {
      alert('Пожалуйста, выберите адрес доставки');
      return;
    }

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      alert('Пожалуйста, заполните все обязательные поля');
      return;
    }

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
          onChange={(e) => handleInputChange('name', e.target.value)}
          type='text'
          placeholder='Имя Фамилия'
        />
        <Input
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          type='email'
          placeholder='Email'
        />
      </section>

      <section>
        <DeliveryProfile onSelectAddress={handleAddressSelect} />
      </section>

      <section className={styles.phoneWrapper}>
        <Input
          value={formData.phone}
          onChange={(e) => {
            let value = e.target.value.replace(/\D/g, ''); // Удаляем все нецифровые символы
            if (value.startsWith('8')) {
              value = value.substring(1); // Убираем первую 8
            }
            // Ограничиваем до 10 цифр (код страны + 10 цифр)
            if (value.length > 10) {
              value = value.substring(0, 10);
            }
            
            if (value.length > 0) {
              if (value.length <= 3) {
                value = `+8 (${value}`;
              } else if (value.length <= 6) {
                value = `+8 (${value.substring(0, 3)}) ${value.substring(3)}`;
              } else if (value.length <= 8) {
                value = `+8 (${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
              } else {
                value = `+8 (${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6, 8)}-${value.substring(8, 10)}`;
              }
            } else {
              value = '';
            }
            handleInputChange('phone', value);
          }}
          type='text'
          placeholder='+8 (999) 999-99-99'
          maxLength={18}
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