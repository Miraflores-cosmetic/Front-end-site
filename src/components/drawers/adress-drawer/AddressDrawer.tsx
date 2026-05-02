import React, { useEffect, useState } from 'react';
import styles from './AddressDrawer.module.scss'; // Reusing your existing styles

import { useDispatch, useSelector } from 'react-redux';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { Input } from './components/input-profile/Input';
import { createAddressService } from '@/graphql/queries/adress.service';
import { updateAddress } from '@/graphql/queries/address.service';
import { AddressInput, AddressTypeEnum } from '@/graphql/types/adress.types';
import CdekPvzList, { CdekPvzInfo } from '@/components/cdek/CdekPvzList';
import YandexPvzList, { type YandexPvzBrief } from '@/components/yandex/YandexPvzList';
import DeliveryCourierMap from '@/components/yandex/DeliveryCourierMap';
import { buildStreetAddress2WithMeta, parseVspAddressMeta } from '@/lib/addressVspMeta';
import { yandexPointIdForCargoOffers } from '@/lib/yandexPvzCargoId';
import { useToast } from '@/components/toast/toast';
import { AppDispatch, RootState } from '@/store/store';
import { getMe } from '@/store/slices/authSlice';
import { extractRuPostalCode } from '@/utils/extractRuPostalCode';
import { AddressMutationError } from '@/graphql/addressMutationError';

const DELIVERY_OPTIONS = [
  { id: 'cdek_pvz', label: 'СДЭК ПВЗ' },
  { id: 'cdek_courier', label: 'СДЭК Курьер' },
  { id: 'yandex_pvz', label: 'Яндекс ПВЗ' },
  { id: 'yandex_courier', label: 'Яндекс Курьер' },
] as const;

type DeliveryMethodId = (typeof DELIVERY_OPTIONS)[number]['id'];

const DELIVERY_TYPE_LINE: Record<DeliveryMethodId, string> = {
    cdek_pvz: 'СДЭК ПВЗ',
    cdek_courier: 'СДЭК Курьер',
    yandex_pvz: 'Яндекс Доставка ПВЗ',
    yandex_courier: 'Яндекс Доставка Курьер',
};

/** Saleor Address: street_address_2 max 256 символов */
const SALEOR_ADDR_LINE_MAX = 256;

function clampAddressField(value: string | undefined, max: number): string {
    if (!value) return '';
    const t = value.trim();
    return t.length <= max ? t : t.slice(0, max);
}

/** Текст для Saleor в streetAddress2: тип доставки и детали из формы */
function buildDeliveryNoteForSaleor(method: DeliveryMethodId, data: AddressInput): string {
    const typeLine = `Тип доставки: ${DELIVERY_TYPE_LINE[method]}`;
    const parts: string[] = [];
    if (data.city.trim()) parts.push(`г. ${data.city.trim()}`);
    if (data.streetAddress1.trim()) parts.push(`адрес: ${data.streetAddress1.trim()}`);
    if (data.postalCode.trim()) parts.push(`индекс ${data.postalCode.trim()}`);
    if (data.countryArea?.trim()) parts.push(`регион: ${data.countryArea.trim()}`);
    if (data.cityArea?.trim()) parts.push(`район: ${data.cityArea.trim()}`);
    const details = parts.length ? `Детали: ${parts.join('; ')}` : 'Детали: не заполнено';
    const note = `${typeLine}. ${details}`;
    return note.length <= SALEOR_ADDR_LINE_MAX ? note : note.slice(0, SALEOR_ADDR_LINE_MAX);
}

/** После выбора ПВЗ: индекс с ПВЗ (postal_code / из полного адреса); старый индекс только если тот же город. */
function applyCdekPvzToForm(prev: AddressInput, info: CdekPvzInfo): AddressInput {
    const nextCity = (info.cityName || prev.city).trim();
    const prevCity = (prev.city || '').trim();
    const sameCity =
        !prevCity ||
        !nextCity ||
        prevCity.localeCompare(nextCity, 'ru', { sensitivity: 'accent' }) === 0;

    const line1 = (info.address || info.name || prev.streetAddress1).trim();

    let postalFromPvz =
        info.postalCode != null && String(info.postalCode).trim() !== ''
            ? String(info.postalCode).trim()
            : '';
    if (!postalFromPvz) {
        postalFromPvz =
            extractRuPostalCode(info.address) ||
            extractRuPostalCode(line1) ||
            extractRuPostalCode(info.name);
    }

    let postalCode = postalFromPvz;
    if (!postalCode) {
        postalCode = sameCity ? (prev.postalCode || '').trim() : '';
    }

    const region = (info.region || '').trim();
    let countryArea = region;
    if (!countryArea) {
        countryArea = sameCity ? (prev.countryArea || '').trim() : '';
    }

    return {
        ...prev,
        city: nextCity || prev.city,
        streetAddress1: line1 || prev.streetAddress1,
        country: 'RU',
        countryArea,
        postalCode,
    };
}

function applyYandexPvzToForm(prev: AddressInput, info: YandexPvzBrief): AddressInput {
    const nextCity = (info.city || prev.city).trim();
    return {
        ...prev,
        city: nextCity || prev.city,
        streetAddress1: (info.addressLine || prev.streetAddress1).trim() || prev.streetAddress1,
        country: 'RU',
        countryArea: (info.region || prev.countryArea || '').trim(),
        postalCode: (info.postalCode || prev.postalCode || '').trim(),
    };
}

function parseDeliveryMethodFromStreet2(street2: string | undefined | null): DeliveryMethodId {
    const vm = parseVspAddressMeta(street2);
    if (vm?.carrier === 'yandex') {
        return vm.dropoff === 'courier' ? 'yandex_courier' : 'yandex_pvz';
    }
    const s = street2 || '';
    if (/Яндекс.*Курьер/i.test(s) || /Яндекс Доставка Курьер/i.test(s)) return 'yandex_courier';
    if (/Яндекс.*ПВЗ/i.test(s) || /Яндекс доставка ПВЗ/i.test(s)) return 'yandex_pvz';
    if (s.includes('СДЭК Курьер')) return 'cdek_courier';
    if (s.includes('СДЭК ПВЗ')) return 'cdek_pvz';
    return 'cdek_pvz';
}

const EMPTY_FORM: AddressInput = {
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
};

const AddressDrawer: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const activeDrawer = useSelector((s: RootState) => s.drawer.activeDrawer);
    const addressDrawer = useSelector((s: RootState) => s.drawer.addressDrawer);
    const [isLoading, setIsLoading] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodId>('cdek_pvz');
    /** Для сохранённой строки меты Яндекс ПВЗ */
    const [yandexPvzDraft, setYandexPvzDraft] = useState<{
        id: string;
        cid: string;
        lat: number;
        lon: number;
    } | null>(null);
    /** Координаты курьера Яндекс */
    const [yandexCourierLl, setYandexCourierLl] = useState<{ lon: string; lat: string } | null>(
        null,
    );
    const toast = useToast();

    const [formData, setFormData] = useState<AddressInput>({ ...EMPTY_FORM });
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});

    const editingAddressId = addressDrawer?.editingAddressId ?? null;
    const isEditMode = Boolean(editingAddressId);

    useEffect(() => {
        if (activeDrawer !== 'address') return;
        setFieldErrors({});
        const seed = addressDrawer?.seed;
        if (seed) {
            setFormData({
                firstName: seed.firstName || '',
                lastName: seed.lastName || '',
                phone: seed.phone || '',
                companyName: seed.companyName || '',
                country: seed.country?.code || 'RU',
                city: seed.city || '',
                cityArea: seed.cityArea || '',
                streetAddress1: seed.streetAddress1 || '',
                postalCode: seed.postalCode || '',
                countryArea: seed.countryArea || '',
                streetAddress2: seed.streetAddress2 || '',
            });
            setDeliveryMethod(parseDeliveryMethodFromStreet2(seed.streetAddress2));
            const ym = parseVspAddressMeta(seed.streetAddress2);
            if (ym?.carrier === 'yandex' && ym.dropoff === 'pvz' && ym.pvz) {
                const la = parseFloat(ym.lat);
                const lo = parseFloat(ym.lon);
                setYandexPvzDraft({
                    id: ym.pvz,
                    cid: (ym.cid || ym.pvz || '').trim(),
                    lat: Number.isFinite(la) ? la : 0,
                    lon: Number.isFinite(lo) ? lo : 0,
                });
            } else {
                setYandexPvzDraft(null);
            }
            if (ym?.carrier === 'yandex' && ym.dropoff === 'courier') {
                setYandexCourierLl({
                    lon: ym.lon,
                    lat: ym.lat,
                });
            } else {
                setYandexCourierLl(null);
            }
        } else {
            setFormData({ ...EMPTY_FORM });
            setDeliveryMethod('cdek_pvz');
            setYandexPvzDraft(null);
            setYandexCourierLl(null);
        }
    }, [activeDrawer, addressDrawer?.editingAddressId, addressDrawer?.seed?.id]);

    const handleChange = (field: keyof AddressInput, value: string) => {
        setFieldErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
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
        setFieldErrors({});
        try {
            const payload = { ...formData };

            // OPTIONAL: If you want to force countryArea to be empty for UZ to avoid errors
            if (payload.country === 'UZ') {
                payload.countryArea = ""; 
            }
            
            // Clean up empty optional fields to avoid backend validation issues
            // (Some backends hate "null", some hate "", so we ensure it matches the Type)
            // companyName всегда пустая строка, не показываем в UI
            payload.companyName = "";
            if (!payload.cityArea) payload.cityArea = "";
            if (!payload.countryArea) payload.countryArea = "";
            if (payload.country === 'RU') {
                const tail = buildDeliveryNoteForSaleor(deliveryMethod, payload);

                if (deliveryMethod === 'yandex_pvz') {
                    if (!yandexPvzDraft?.id) {
                        toast.error('Выберите пункт Яндекс Доставки в списке или на карте');
                        setIsLoading(false);
                        return;
                    }
                    payload.streetAddress2 = buildStreetAddress2WithMeta(
                        {
                            carrier: 'yandex',
                            lon: String(yandexPvzDraft.lon),
                            lat: String(yandexPvzDraft.lat),
                            pvz: yandexPvzDraft.id,
                            cid: yandexPvzDraft.cid !== yandexPvzDraft.id ? yandexPvzDraft.cid : '',
                            dropoff: 'pvz',
                        },
                        tail,
                    );
                } else if (deliveryMethod === 'yandex_courier') {
                    if (!yandexCourierLl?.lon || !yandexCourierLl?.lat) {
                        toast.error('Нажмите на карте, чтобы указать адрес для курьера');
                        setIsLoading(false);
                        return;
                    }
                    payload.streetAddress2 = buildStreetAddress2WithMeta(
                        {
                            carrier: 'yandex',
                            lon: yandexCourierLl.lon,
                            lat: yandexCourierLl.lat,
                            pvz: '',
                            cid: '',
                            dropoff: 'courier',
                        },
                        tail,
                    );
                } else {
                    payload.streetAddress2 = tail;
                }
            } else {
                payload.streetAddress2 = payload.streetAddress2?.trim() || '';
            }

            payload.streetAddress1 = clampAddressField(payload.streetAddress1, 256);
            payload.streetAddress2 = clampAddressField(payload.streetAddress2, 256);
            payload.countryArea = clampAddressField(payload.countryArea, 128);
            payload.cityArea = clampAddressField(payload.cityArea, 128);
            payload.city = clampAddressField(payload.city, 256);

            if (editingAddressId) {
                await updateAddress(editingAddressId, {
                    firstName: clampAddressField(payload.firstName, 256),
                    lastName: clampAddressField(payload.lastName, 256),
                    phone: payload.phone,
                    country: payload.country,
                    countryArea: payload.countryArea || '',
                    city: payload.city,
                    cityArea: payload.cityArea || '',
                    streetAddress1: payload.streetAddress1,
                    streetAddress2: payload.streetAddress2 || '',
                    postalCode: clampAddressField(payload.postalCode, 20),
                    companyName: payload.companyName || '',
                });
                toast.success('Адрес обновлён');
            } else {
                await createAddressService(payload, AddressTypeEnum.SHIPPING);
                toast.success('Адрес успешно сохранен!');
            }
            await dispatch(getMe());
            handleClose();
        } catch (error: unknown) {
            if (error instanceof AddressMutationError) {
                setFieldErrors(error.fieldErrors);
                toast.error(error.message);
            } else {
                toast.error(
                    error instanceof Error ? error.message : 'Произошла ошибка при сохранении адреса',
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.drawer}>
            <div className={styles.contentWrapper}>
                <header className={styles.headerWrapper}>
                    <p className={styles.title}>Адрес доставки</p>
                    <button type="button" onClick={handleClose} className={styles.closeTxt}>
                        Закрыть
                    </button>
                </header>

                {/* Address Information Group */}
                <article className={styles.dadteOfBirdthWrapper}>
                    {formData.country === 'RU' && (
                        <>
                            <div className={styles.deliveryMethodSection}>
                                <p className={styles.deliveryMethodLabel}>Способ доставки</p>
                                <div className={styles.deliveryMethodGrid} role="group" aria-label="Способ доставки">
                                    {DELIVERY_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`${styles.deliveryMethodChip} ${
                                                deliveryMethod === opt.id ? styles.deliveryMethodChipActive : ''
                                            }`}
                                            onClick={() => setDeliveryMethod(opt.id)}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {deliveryMethod === 'cdek_pvz' && (
                                <div className={styles.widgetPanel}>
                                    <div>
                                        <h3 className={styles.widgetTitle}>Пункт выдачи СДЭК</h3>
                                        <p className={styles.widgetDescription}>
                                            Выберите ПВЗ в списке или на карте — поля адреса заполнятся автоматически.
                                        </p>
                                    </div>
                                    <CdekPvzList
                                        onChoose={(info: CdekPvzInfo) => {
                                            setFormData((prev) => applyCdekPvzToForm(prev, info));
                                        }}
                                        defaultCity={formData.city || 'Москва'}
                                        initialMode="map"
                                    />
                                </div>
                            )}

                            {deliveryMethod === 'cdek_courier' && (
                                <div className={styles.widgetPanel}>
                                    <h3 className={styles.widgetTitle}>Курьер СДЭК</h3>
                                    <p className={styles.widgetDescription}>
                                        Укажите ниже полный адрес доставки: улицу, дом, квартиру, подъезд и домофон при
                                        необходимости. Индекс и город помогут курьеру найти вас быстрее.
                                    </p>
                                </div>
                            )}

                            {deliveryMethod === 'yandex_pvz' && (
                                <div className={styles.widgetPanel}>
                                    <div>
                                        <h3 className={styles.widgetTitle}>Пункт выдачи — Яндекс Доставка</h3>
                                        <p className={styles.widgetDescription}>
                                            Выберите город и пункт выдачи. Адрес в форме ниже можно уточнить вручную.
                                        </p>
                                    </div>
                                    <YandexPvzList
                                        onChoose={(info: YandexPvzBrief) => {
                                            setFormData((prev) => applyYandexPvzToForm(prev, info));
                                            const cid = yandexPointIdForCargoOffers({
                                                id: info.id,
                                                operatorId: info.operatorId,
                                            });
                                            setYandexPvzDraft({
                                                id: info.id,
                                                cid: cid || info.id,
                                                lat: info.lat,
                                                lon: info.lon,
                                            });
                                        }}
                                        defaultCity={formData.city || 'Москва'}
                                        initialMode="map"
                                    />
                                </div>
                            )}

                            {deliveryMethod === 'yandex_courier' && (
                                <div className={styles.widgetPanel}>
                                    <h3 className={styles.widgetTitle}>Курьер — Яндекс Доставка</h3>
                                    <p className={styles.widgetDescription}>
                                        Отметьте на карте зону доставки. Уточните ниже номер дома, квартиру и контакты —
                                        без курьерского адреса доставку не получится рассчитать автоматически.
                                    </p>
                                    <DeliveryCourierMap
                                        cityHint={formData.city || 'Москва'}
                                        onChoose={(sel) => {
                                            setYandexCourierLl({
                                                lon: String(sel.lon),
                                                lat: String(sel.lat),
                                            });
                                            const g = sel.geoLine?.trim();
                                            if (g) {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    streetAddress1: prev.streetAddress1?.trim()
                                                        ? prev.streetAddress1
                                                        : clampAddressField(g, 256),
                                                }));
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    <Input
                        label='Улица, дом, квартира'
                        value={formData.streetAddress1}
                        onChange={(e) => handleChange('streetAddress1', e.target.value)}
                        fieldError={fieldErrors.streetAddress1}
                    />

                    <div className={styles.inputWrapper}>
                        <Input
                            label='Город'
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            width='50%'
                            fieldError={fieldErrors.city}
                        />
                        <Input
                            label='Индекс'
                            value={formData.postalCode}
                            onChange={(e) => handleChange('postalCode', e.target.value)}
                            width='50%'
                            fieldError={fieldErrors.postalCode}
                        />
                    </div>

                    <div className={styles.inputWrapper}>
                        <Input
                            label='Область/Район'
                            value={formData.countryArea || ''}
                            onChange={(e) => handleChange('countryArea', e.target.value)}
                            width='50%'
                            fieldError={fieldErrors.countryArea}
                        />
                        <Input
                            label='Район города (необяз.)'
                            value={formData.cityArea || ''}
                            onChange={(e) => handleChange('cityArea', e.target.value)}
                            width='50%'
                            fieldError={fieldErrors.cityArea}
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
                    {isLoading
                        ? 'Сохранение...'
                        : isEditMode
                          ? 'Сохранить изменения'
                          : 'Сохранить адрес'}
                </button>
            </div>
        </div>
    );
};

export default AddressDrawer;