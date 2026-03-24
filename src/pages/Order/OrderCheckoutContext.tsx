import React, { createContext, useContext, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import type { AddressInfo } from '@/types/auth';
import { useCdekShippingEstimate } from './useCdekShippingEstimate';

export type OrderCheckoutContextValue = {
    selectedAddress: AddressInfo | null;
    setSelectedAddress: (a: AddressInfo | null) => void;
    cdekShippingRub: number | null;
    cdekShippingLoading: boolean;
    cdekShippingError: string | null;
};

const OrderCheckoutContext = createContext<OrderCheckoutContextValue | null>(null);

export function useOrderCheckoutOptional(): OrderCheckoutContextValue | null {
    return useContext(OrderCheckoutContext);
}

export function OrderCheckoutProvider({ children }: { children: React.ReactNode }) {
    const { lines } = useSelector((s: RootState) => s.checkout);
    const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null);
    const { rub, loading, error } = useCdekShippingEstimate(lines, selectedAddress);

    const value = useMemo<OrderCheckoutContextValue>(
        () => ({
            selectedAddress,
            setSelectedAddress,
            cdekShippingRub: rub,
            cdekShippingLoading: loading,
            cdekShippingError: error,
        }),
        [selectedAddress, rub, loading, error],
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
