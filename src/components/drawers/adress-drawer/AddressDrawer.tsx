import React, { useState } from 'react';
import styles from './AddressDrawer.module.scss'; // Reusing your existing styles

import { useDispatch } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Input } from './components/input-profile/Input';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import { createAddressService } from '@/graphql/queries/adress.service';
import { AddressInput, AddressTypeEnum } from '@/graphql/types/adress.types';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import CdekPvzList, { CdekPvzInfo } from '@/components/cdek/CdekPvzList';
import { useToast } from '@/components/toast/toast';
import { AppDispatch } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
// import { uppercase } from 'node_modules/graphql-request/build/lib/prelude';

const AddressDrawer: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const isMobile = useScreenMatch(450);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    // Clean state object instead of 10 separate hooks
    const [formData, setFormData] = useState<AddressInput>({
        firstName: '',
        lastName: '',
        phone: '',
        companyName: '',
        country: 'RU',
        city: '',
        cityArea: '',
        streetAddress1: '',
        postalCode: '',
        countryArea: '',
    });

    // Generic handler for all inputs
    const handleChange = (field: keyof AddressInput, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleClose = () => {
        dispatch(closeDrawer());
    };

    const handleSubmit = async () => {
        if (!formData.country) {
            toast.error('Пожалуйста, введите код страны (например, RU)');
            return;
        }
        setIsLoading(true);
        try {
            const payload = { ...formData };

            // OPTIONAL: If you want to force countryArea to be empty for UZ to avoid errors
            if (payload.country === 'UZ') {
                payload.countryArea = ""; 
            }
            
            // Clean up empty optional fields to avoid backend validation issues
            // (Some backends hate "null", some hate "", so we ensure it matches the Type)
            if (!payload.companyName) payload.companyName = "";
            if (!payload.cityArea) payload.cityArea = "";
            if (!payload.countryArea) payload.countryArea = "";
            // Example: Creating a Shipping address
            await createAddressService(formData, AddressTypeEnum.SHIPPING);
            // Обновляем данные пользователя, чтобы новый адрес появился в списке
            await dispatch(getMe());
            toast.success('Адрес успешно сохранен!');
            handleClose();
        } catch (error: any) {
            toast.error(error.message || 'Произошла ошибка при сохранении адреса');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.drawer}>
            <div className={styles.contentWrapper}>
                <header className={styles.headerWrapper}>
                    <p className={styles.aboutUs}>Новый адрес</p>
                    <p className={styles.close} onClick={handleClose}>
                        Закрыть
                    </p>
                </header>

                {/* Address Information Group */}
                <article className={styles.dadteOfBirdthWrapper}>
                    <p className={styles.title}>Адрес доставки</p>

                    {formData.country === 'RU' && (
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '12px', 
                            padding: '16px', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            borderRadius: '12px', 
                            background: 'rgba(0,0,0,0.02)',
                            marginBottom: '16px'
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
                            <CdekPvzList
                                onChoose={(info: CdekPvzInfo) => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        city: info.cityName || prev.city,
                                        streetAddress1: info.address || info.name || prev.streetAddress1,
                                        country: 'RU',
                                        countryArea: info.cityName || prev.countryArea,
                                        postalCode: info.postalCode || prev.postalCode || '101000',
                                    }));
                                }}
                                defaultCity={formData.city || 'Москва'}
                                initialMode="map"
                            />
                        </div>
                    )}

                    <Input
                        label='Страна'
                        placeholder='Код страны (напр. RU, AF)'
                        value={formData.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                    />

                    <Input
                        label='Улица, дом, квартира'
                        value={formData.streetAddress1}
                        onChange={(e) => handleChange('streetAddress1', e.target.value)}
                    />

                    <div className={styles.inputWrapper}>
                        <Input
                            label='Город'
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            width='50%'
                        />
                        <Input
                            label='Индекс'
                            value={formData.postalCode}
                            onChange={(e) => handleChange('postalCode', e.target.value)}
                            width='50%'
                        />
                    </div>

                    <div className={styles.inputWrapper}>
                        <Input
                            label='Область/Район'
                            value={formData.countryArea || ''}
                            onChange={(e) => handleChange('countryArea', e.target.value)}
                            width='50%'
                        />
                        <Input
                            label='Район города (необяз.)'
                            value={formData.cityArea || ''}
                            onChange={(e) => handleChange('cityArea', e.target.value)}
                            width='50%'
                        />
                    </div>
                </article>

            </div>

            <div className={styles.buttonWrapper}>
                <button
                    className={styles.saveButton}
                    onClick={handleSubmit}
                    disabled={isLoading}
                >
                    {isLoading ? 'Сохранение...' : 'Сохранить адрес'}
                </button>
            </div>
        </div>
    );
};

export default AddressDrawer;