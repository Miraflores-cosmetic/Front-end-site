import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styles from './AddressModal.module.scss';
import { AddressInfo } from '@/types/auth';
import { createAddress, updateAddress, AddressCreateInput } from '@/graphql/queries/address.service';
import { useToast } from '@/components/toast/toast';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import CdekPvzList, { CdekPvzInfo } from '@/components/cdek/CdekPvzList';

interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
  onAddressAdded: () => void;
  onAddressUpdated?: () => void;
  addressToEdit?: AddressInfo | null;
}

const AddressModal: React.FC<AddressModalProps> = ({
  visible,
  onClose,
  onAddressAdded,
  onAddressUpdated,
  addressToEdit,
}) => {
  const { me } = useSelector((state: RootState) => state.authSlice);
  const dispatch = useDispatch<AppDispatch>();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(visible);
  const isEditMode = !!addressToEdit;

  const [formData, setFormData] = useState<AddressCreateInput>({
    firstName: me?.firstName || '',
    lastName: me?.lastName || '',
    phone: '',
    country: 'RU',
    countryArea: '',
    city: '',
    cityArea: '',
    streetAddress1: '',
    streetAddress2: '',
    postalCode: '',
    companyName: '',
  });

  const [isDefaultShipping, setIsDefaultShipping] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCdekPvzSelected, setIsCdekPvzSelected] = useState(false);

  useEffect(() => {
    if (visible) {
      setShow(true);
      if (addressToEdit) {
        const countryCode =
          typeof addressToEdit.country === 'object' && addressToEdit.country !== null
            ? (addressToEdit.country as any).code
            : addressToEdit.country;

        setFormData({
          firstName: me?.firstName || addressToEdit.firstName || '',
          lastName: me?.lastName || addressToEdit.lastName || '',
          phone: addressToEdit.phone || '',
          country: countryCode || 'RU',
          countryArea: addressToEdit.countryArea || '',
          city: addressToEdit.city || '',
          cityArea: addressToEdit.cityArea || '',
          streetAddress1: addressToEdit.streetAddress1 || '',
          streetAddress2: addressToEdit.streetAddress2 || '',
          postalCode: addressToEdit.postalCode || '',
          companyName: addressToEdit.companyName || '',
        });
      } else {
        // Pre-fill from user profile with Moscow as default city
        setFormData({
          firstName: me?.firstName || '',
          lastName: me?.lastName || '',
          phone: '',
          country: 'RU',
          countryArea: 'Московская область',
          city: 'Москва',
          cityArea: '',
          streetAddress1: '',
          streetAddress2: '',
          postalCode: '',
          companyName: '',
        });
      }
    } else {
        const timeout = setTimeout(() => {
          setShow(false);
          setErrors({});
          setIsCdekPvzSelected(false);
        }, 300);
        return () => clearTimeout(timeout);
      }
    }, [visible, addressToEdit, me]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (visible) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // country всегда 'RU', не проверяем
    if (!formData.countryArea.trim()) newErrors.countryArea = 'Обязательное поле';
    if (!formData.city.trim()) newErrors.city = 'Обязательное поле';
    
    // Если ПВЗ СДЭК не выбран, проверяем обязательные поля
    if (!isCdekPvzSelected && !formData.cityArea.trim()) {
      newErrors.cityArea = 'Обязательное поле';
    }
    if (!formData.streetAddress1.trim()) {
      newErrors.streetAddress1 = 'Обязательное поле';
    }
    
    if (!formData.postalCode.trim()) newErrors.postalCode = 'Обязательное поле';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCdekPvzChoose = (info: CdekPvzInfo) => {
    setIsCdekPvzSelected(true);

    let parsedCity = info.cityName || '';
    let parsedAddress = info.address || info.name || '';

    if (info.name && !info.address) {
      parsedAddress = info.name;
      const parts = info.name.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        parsedCity = parts[1];
      }
    }

    setErrors((prev) => ({
      ...prev,
      city: '',
      streetAddress1: '',
      countryArea: '',
      cityArea: '',
      postalCode: '',
    }));

    setFormData((prev) => ({
      ...prev,
      city: parsedCity || prev.city,
      streetAddress1: parsedAddress || prev.streetAddress1,
      country: 'RU',
      countryArea: parsedCity || prev.countryArea,
      cityArea: '',
      postalCode: info.postalCode || prev.postalCode || '101000',
    }));

    toast.success('Адрес ПВЗ выбран и заполнен');
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && addressToEdit) {
        await updateAddress(addressToEdit.id, formData);
        // Обновляем данные пользователя сразу после сохранения
        await dispatch(getMe());
        if (onAddressUpdated) onAddressUpdated();
        toast.success('Адрес успешно обновлен!');
      } else {
        await createAddress(formData, isDefaultShipping);
        // Обновляем данные пользователя сразу после сохранения
        await dispatch(getMe());
        onAddressAdded();
        toast.success('Адрес успешно добавлен!');
      }

      onClose();
    } catch (error: any) {
      console.error('Address operation error:', error);
      
      // Проверка на ошибки авторизации
      if (error?.message?.includes('PermissionDenied') || error?.message?.includes('AUTHENTICATED_USER')) {
        toast.error('Ошибка авторизации. Пожалуйста, войдите в систему заново.');
        // Можно добавить редирект на страницу входа
        // window.location.href = '/sign-in';
      } else {
        toast.error(error?.message || (isEditMode ? 'Ошибка при обновлении' : 'Ошибка при добавлении адреса'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof AddressCreateInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (!show) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: visible ? 0 : '100%' }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditMode ? 'Редактировать адрес' : 'Новый адрес'}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {formData.country === 'RU' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              padding: '16px', 
              border: '1px solid rgba(0,0,0,0.1)', 
              borderRadius: '12px', 
              background: 'rgba(0,0,0,0.02)' 
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                  Выбрать пункт выдачи СДЭК
                </h3>
                <p style={{ fontSize: '14px', color: 'rgba(0,0,0,0.6)' }}>
                  Выберите пункт выдачи заказа в списке или на карте Яндекс,
                  чтобы автоматически заполнить адресные поля
                </p>
              </div>
              {(() => {
                console.log('[AddressModal] Rendering CdekPvzList with city:', formData.city || 'Москва');
                return (
                  <CdekPvzList
                    onChoose={(info) => {
                      console.log('[AddressModal] CdekPvzList onChoose called:', info);
                      handleCdekPvzChoose(info);
                    }}
                    defaultCity={formData.city || 'Москва'}
                    initialMode="map"
                  />
                );
              })()}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Регион *</label>
            <input
              type="text"
              value={formData.countryArea}
              onChange={(e) => handleInputChange('countryArea', e.target.value)}
              className={`${styles.input} ${errors.countryArea ? styles.error : ''}`}
            />
            {errors.countryArea && <span className={styles.errorText}>{errors.countryArea}</span>}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Город *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className={`${styles.input} ${errors.city ? styles.error : ''}`}
              />
              {errors.city && <span className={styles.errorText}>{errors.city}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Район</label>
              <input
                type="text"
                value={formData.cityArea}
                onChange={(e) => handleInputChange('cityArea', e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Адрес улицы *</label>
            <input
              type="text"
              value={formData.streetAddress1}
              onChange={(e) => handleInputChange('streetAddress1', e.target.value)}
              className={`${styles.input} ${errors.streetAddress1 ? styles.error : ''}`}
            />
            {errors.streetAddress1 && (
              <span className={styles.errorText}>{errors.streetAddress1}</span>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Дополнительный адрес</label>
            <input
              type="text"
              value={formData.streetAddress2}
              onChange={(e) => handleInputChange('streetAddress2', e.target.value)}
              className={styles.input}
              placeholder="Например: Квартира 5, подъезд 2"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Почтовый индекс *</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              className={`${styles.input} ${errors.postalCode ? styles.error : ''}`}
            />
            {errors.postalCode && <span className={styles.errorText}>{errors.postalCode}</span>}
          </div>

          {!isEditMode && (
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={isDefaultShipping}
                onChange={(e) => setIsDefaultShipping(e.target.checked)}
              />
              <span>Установить как адрес доставки по умолчанию</span>
            </label>
          )}
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`${styles.submitBtn} ${loading ? styles.loading : ''}`}
          >
            {loading
              ? 'Сохранение...'
              : isEditMode
                ? 'Сохранить изменения'
                : 'Добавить адрес'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddressModal;
