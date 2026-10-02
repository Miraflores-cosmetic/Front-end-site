import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import type { AddressInfo } from '@/types/auth';
import { useProgressBarCartModel } from '@/hooks/useProgressBarCartModel';
import {
    calcCartSubtotal,
    isPvzDeliveryAddress,
    qualifiesForFreePvzShipping,
} from '@/utils/freePvzShipping';
import { isCheckoutReadyAddress } from '@/utils/checkoutShipping';
import { calcPayableTotals, type PayableTotals } from '@/utils/payableTotal';
import {
    loadGuestShippingAddress,
    subscribeGuestShippingAddress,
} from '@/utils/guestShippingAddress';
import { useCdekShippingEstimate, type ShippingEstimateMeta } from './useCdekShippingEstimate';
import { revalidateVoucher } from '@/store/slices/checkoutSlice';
import { apiFetch } from '@/api/apiClient';
import { resolveCheckoutShippingMethod } from '@/utils/checkoutShipping';
import {
    clientEstimateBaseRub,
    DELIVERY_SURCHARGE_DEFAULTS,
    normalizeDeliverySurcharges,
    type DeliverySurcharges,
    withDeliverySurcharge,
} from '@/utils/deliverySurcharge';

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export type OrderCheckoutContextValue = {
    selectedAddress: AddressInfo | null;
    /**
     * Единственный способ выбрать сохранённый адрес для checkout.
     * Без carrier (СДЭК/Яндекс) — false, адрес не применяется.
     */
    applySavedAddress: (a: AddressInfo) => boolean;
    clearSelectedAddress: () => void;
    checkoutEmail: string;
    setCheckoutEmail: (email: string) => void;
    cdekShippingRub: number | null;
    cdekShippingLoading: boolean;
    cdekShippingError: string | null;
    /** Мета последнего расчёта тарифа (СДЭК tariff_code / сроки). */
    shippingQuoteMeta: ShippingEstimateMeta | null;
    /** Без добавочной стоимости — для requestShippingQuote.clientEstimate. */
    shippingQuoteClientEstimateRub: number | null;
    freePvzShippingApplied: boolean;
    payable: PayableTotals;
};

const OrderCheckoutContext = createContext<OrderCheckoutContextValue | null>(null);

export function useOrderCheckoutOptional(): OrderCheckoutContextValue | null {
    return useContext(OrderCheckoutContext);
}

export function OrderCheckoutProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch<AppDispatch>();
    const { lines, voucherDiscount, voucherCode, voucherKind } = useSelector(
        (s: RootState) => s.checkout,
    );
    const isAuth = useSelector((s: RootState) => s.authSlice.isAuth);
    const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null);
    const [checkoutEmail, setCheckoutEmail] = useState('');
    const [deliverySurcharges, setDeliverySurcharges] = useState<DeliverySurcharges>(
        DELIVERY_SURCHARGE_DEFAULTS,
    );
    const prevEmailRef = useRef('');
    const { rub, loading, error, quoteMeta } = useCdekShippingEstimate(lines, selectedAddress);
    const { threshold } = useProgressBarCartModel();

    const applySavedAddress = useCallback((a: AddressInfo) => {
        if (!isCheckoutReadyAddress(a)) {
            return false;
        }
        setSelectedAddress(a);
        return true;
    }, []);

    const clearSelectedAddress = useCallback(() => {
        setSelectedAddress(null);
    }, []);

    useEffect(() => {
        let cancelled = false;
        void apiFetch<Partial<DeliverySurcharges>>('/settings/delivery-surcharges', {
            skipAuth: true,
        })
            .then((data) => {
                if (!cancelled) setDeliverySurcharges(normalizeDeliverySurcharges(data));
            })
            .catch(() => {
                if (!cancelled) setDeliverySurcharges(DELIVERY_SURCHARGE_DEFAULTS);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (isAuth) return;
        const draft = loadGuestShippingAddress();
        if (draft) applySavedAddress(draft);
        return subscribeGuestShippingAddress((next) => {
            if (next) applySavedAddress(next);
            else setSelectedAddress(null);
        });
    }, [isAuth, applySavedAddress]);

    useEffect(() => {
        const email = checkoutEmail.trim();
        if (!voucherCode || !EMAIL_RE.test(email)) return;
        if (prevEmailRef.current === email) return;
        prevEmailRef.current = email;
        void dispatch(revalidateVoucher(email));
    }, [checkoutEmail, voucherCode, dispatch]);

    const subtotal = useMemo(() => calcCartSubtotal(lines), [lines]);

    // Free PVZ — по goods subtotal до промо (см. freePvzShipping / Nest computeFreePvzShipping).
    const freePvzShippingApplied = useMemo(() => {
        if (loading || error || rub == null || !selectedAddress) return false;
        return (
            qualifiesForFreePvzShipping(subtotal, threshold) &&
            isPvzDeliveryAddress(selectedAddress)
        );
    }, [loading, error, rub, selectedAddress, subtotal, threshold]);

    const checkoutShippingMethod = useMemo(
        () => resolveCheckoutShippingMethod(selectedAddress?.streetAddress2),
        [selectedAddress?.streetAddress2],
    );

    const effectiveShippingRub = useMemo(() => {
        if (rub == null) return null;
        if (freePvzShippingApplied) return 0;
        return withDeliverySurcharge(rub, checkoutShippingMethod, deliverySurcharges) ?? rub;
    }, [rub, freePvzShippingApplied, checkoutShippingMethod, deliverySurcharges]);

    const shippingQuoteClientEstimateRub = useMemo(() => {
        if (freePvzShippingApplied) return 0;
        if (effectiveShippingRub == null) return null;
        if (!checkoutShippingMethod) return effectiveShippingRub;
        return clientEstimateBaseRub(
            effectiveShippingRub,
            checkoutShippingMethod,
            deliverySurcharges,
        );
    }, [
        freePvzShippingApplied,
        effectiveShippingRub,
        checkoutShippingMethod,
        deliverySurcharges,
    ]);

    const payable = useMemo(
        () =>
            calcPayableTotals({
                lines,
                voucherDiscount,
                voucherKind,
                shippingRub: effectiveShippingRub,
                shippingLoading: loading,
                shippingError: error,
            }),
        [lines, voucherDiscount, voucherKind, effectiveShippingRub, loading, error],
    );

    // Gift validate зависит от shipping: пересчитываем applyAmount при смене тарифа.
    const shippingForGiftKey =
        voucherKind === 'gift' && effectiveShippingRub != null
            ? String(effectiveShippingRub)
            : '';
    useEffect(() => {
        if (voucherKind !== 'gift' || !voucherCode || !shippingForGiftKey) return;
        void dispatch(
            revalidateVoucher({
                shippingRub: effectiveShippingRub,
            }),
        );
    }, [voucherKind, voucherCode, shippingForGiftKey, effectiveShippingRub, dispatch]);

    const value = useMemo<OrderCheckoutContextValue>(
        () => ({
            selectedAddress,
            applySavedAddress,
            clearSelectedAddress,
            checkoutEmail,
            setCheckoutEmail,
            cdekShippingRub: effectiveShippingRub,
            cdekShippingLoading: loading,
            cdekShippingError: error,
            shippingQuoteMeta: quoteMeta,
            shippingQuoteClientEstimateRub,
            freePvzShippingApplied,
            payable,
        }),
        [
            selectedAddress,
            applySavedAddress,
            clearSelectedAddress,
            checkoutEmail,
            effectiveShippingRub,
            loading,
            error,
            quoteMeta,
            shippingQuoteClientEstimateRub,
            freePvzShippingApplied,
            payable,
        ],
    );

    return <OrderCheckoutContext.Provider value={value}>{children}</OrderCheckoutContext.Provider>;
}

export function useOrderCheckout(): OrderCheckoutContextValue {
    const ctx = useContext(OrderCheckoutContext);
    if (!ctx) {
        throw new Error('useOrderCheckout must be used within OrderCheckoutProvider');
    }
    return ctx;
}
