import React, { createContext, useContext, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { AddressInfo } from '@/types/auth';
import { useProgressBarCartModel } from '@/hooks/useProgressBarCartModel';
import {
    calcCartSubtotal,
    isPvzDeliveryAddress,
    qualifiesForFreePvzShipping,
} from '@/utils/freePvzShipping';
import { useCdekShippingEstimate } from './useCdekShippingEstimate';

export type OrderCheckoutContextValue = {
    selectedAddress: AddressInfo | null;
    setSelectedAddress: (a: AddressInfo | null) => void;
    cdekShippingRub: number | null;
    cdekShippingLoading: boolean;
    cdekShippingError: string | null;
    /** Бесплатная доставка до ПВЗ по порогу progress-bar-korziny */
    freePvzShippingApplied: boolean;
};

const OrderCheckoutContext = createContext<OrderCheckoutContextValue | null>(null);

export function useOrderCheckoutOptional(): OrderCheckoutContextValue | null {
    return useContext(OrderCheckoutContext);
}

export function OrderCheckoutProvider({ children }: { children: React.ReactNode }) {
    const { lines } = useSelector((s: RootState) => s.checkout);
    const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null);
    const { rub, loading, error } = useCdekShippingEstimate(lines, selectedAddress);
    const { threshold } = useProgressBarCartModel();

    const subtotal = useMemo(() => calcCartSubtotal(lines), [lines]);

    const freePvzShippingApplied = useMemo(() => {
        if (loading || error || rub == null || !selectedAddress) return false;
        return (
            qualifiesForFreePvzShipping(subtotal, threshold) &&
            isPvzDeliveryAddress(selectedAddress)
        );
    }, [loading, error, rub, selectedAddress, subtotal, threshold]);

    const effectiveShippingRub = useMemo(() => {
        if (rub == null) return null;
        if (freePvzShippingApplied) return 0;
        return rub;
    }, [rub, freePvzShippingApplied]);

    const value = useMemo<OrderCheckoutContextValue>(
        () => ({
            selectedAddress,
            setSelectedAddress,
            cdekShippingRub: effectiveShippingRub,
            cdekShippingLoading: loading,
            cdekShippingError: error,
            freePvzShippingApplied,
        }),
        [selectedAddress, effectiveShippingRub, loading, error, freePvzShippingApplied],
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
