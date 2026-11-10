import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import type { AddressInfo } from '@/types/auth';
import { useProgressBarCartModel } from '@/hooks/useProgressBarCartModel';
import {
    calcCartSubtotal,
    goodsSubtotalForFreePvzThreshold,
    isPvzDeliveryAddress,
    qualifiesForFreePvzShipping,
} from '@/utils/freePvzShipping';
import { isCheckoutReadyAddress } from '@/utils/checkoutShipping';
import { isAddressClarification } from '@/utils/addressClarification';
import { calcPayableTotals, type PayableTotals } from '@/utils/payableTotal';
import { computeReferralSpendAmount } from '@/utils/referralSpendAmount';
import {
    loadGuestShippingAddress,
    subscribeGuestShippingAddress,
} from '@/utils/guestShippingAddress';
import {
    loadCheckoutClarificationDraft,
    subscribeCheckoutClarificationDraft,
} from '@/utils/checkoutClarificationDraft';
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
    /** Клиент не нашёл адрес — доставка ещё не посчитана (не «бесплатно»). */
    needsAddressClarification: boolean;
    payable: PayableTotals;
};

const OrderCheckoutContext = createContext<OrderCheckoutContextValue | null>(null);

export function useOrderCheckoutOptional(): OrderCheckoutContextValue | null {
    return useContext(OrderCheckoutContext);
}

export function OrderCheckoutProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useDispatch<AppDispatch>();
    const { lines, voucherDiscount, voucherCode, voucherKind, useReferralWallet } =
        useSelector((s: RootState) => s.checkout);
    const isAuth = useSelector((s: RootState) => s.authSlice.isAuth);
    const referralWalletAvailable = useSelector(
        (s: RootState) => s.authSlice.me?.referralWalletAvailable ?? 0,
    );
    const referralSpendCapPercent = useSelector(
        (s: RootState) => s.authSlice.me?.referralSpendCapPercent ?? 0,
    );
    const [selectedAddress, setSelectedAddress] = useState<AddressInfo | null>(null);
    const [checkoutEmail, setCheckoutEmail] = useState('');
    const [deliverySurcharges, setDeliverySurcharges] = useState<DeliverySurcharges>(
        DELIVERY_SURCHARGE_DEFAULTS,
    );
    const prevEmailRef = useRef('');
    const addressNeedsClarification = isAddressClarification(selectedAddress);
    const { rub, loading, error, quoteMeta } = useCdekShippingEstimate(
        lines,
        addressNeedsClarification ? null : selectedAddress,
    );
    const shippingRub = addressNeedsClarification ? 0 : rub;
    const shippingLoading = addressNeedsClarification ? false : loading;
    const shippingError = addressNeedsClarification ? null : error;
    const shippingQuoteMeta = addressNeedsClarification ? null : quoteMeta;
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
        void apiFetch<Record<string, unknown>>('/settings/delivery-surcharges', {
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

    /** Logged-in: ephemeral clarification draft (session), не account addresses. */
    useEffect(() => {
        if (!isAuth) return;
        const draft = loadCheckoutClarificationDraft();
        if (draft) applySavedAddress(draft);
        return subscribeCheckoutClarificationDraft((next) => {
            if (next) applySavedAddress(next);
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

    const promoDiscountForFreePvz =
        voucherKind === 'promo' ? Math.max(0, Math.floor(voucherDiscount || 0)) : 0;
    const subtotalForFreePvz = useMemo(
        () => goodsSubtotalForFreePvzThreshold(subtotal, promoDiscountForFreePvz),
        [subtotal, promoDiscountForFreePvz],
    );

    const freePvzShippingApplied = useMemo(() => {
        if (addressNeedsClarification) return false;
        if (shippingLoading || shippingError || shippingRub == null || !selectedAddress) {
            return false;
        }
        return (
            qualifiesForFreePvzShipping(subtotalForFreePvz, threshold) &&
            isPvzDeliveryAddress(selectedAddress)
        );
    }, [
        addressNeedsClarification,
        shippingLoading,
        shippingError,
        shippingRub,
        selectedAddress,
        subtotalForFreePvz,
        threshold,
    ]);

    const checkoutShippingMethod = useMemo(
        () =>
            addressNeedsClarification
                ? null
                : resolveCheckoutShippingMethod(selectedAddress?.streetAddress2),
        [addressNeedsClarification, selectedAddress?.streetAddress2],
    );

    const effectiveShippingRub = useMemo(() => {
        if (addressNeedsClarification) return 0;
        if (shippingRub == null) return null;
        if (freePvzShippingApplied) return 0;
        return (
            withDeliverySurcharge(shippingRub, checkoutShippingMethod, deliverySurcharges) ??
            shippingRub
        );
    }, [
        addressNeedsClarification,
        shippingRub,
        freePvzShippingApplied,
        checkoutShippingMethod,
        deliverySurcharges,
    ]);

    const shippingQuoteClientEstimateRub = useMemo(() => {
        if (addressNeedsClarification) return 0;
        if (freePvzShippingApplied) return 0;
        if (effectiveShippingRub == null) return null;
        if (!checkoutShippingMethod) return effectiveShippingRub;
        return clientEstimateBaseRub(
            effectiveShippingRub,
            checkoutShippingMethod,
            deliverySurcharges,
        );
    }, [
        addressNeedsClarification,
        freePvzShippingApplied,
        effectiveShippingRub,
        checkoutShippingMethod,
        deliverySurcharges,
    ]);

    const referralWalletAmount = useMemo(() => {
        // enabled гейтит earn, не spend — баланс списываем и при выключенной программе.
        if (!isAuth || !useReferralWallet) return 0;
        const available = Math.max(0, Math.floor(referralWalletAvailable || 0));
        if (available < 1) return 0;
        // Payable до wallet (XOR → без voucher), затем min(available, floor(payable×cap%)).
        const beforeWallet = calcPayableTotals({
            lines,
            voucherDiscount: 0,
            voucherKind: null,
            referralWalletAmount: 0,
            shippingRub: effectiveShippingRub,
            shippingLoading,
            shippingError,
        });
        if (beforeWallet.payableTotal == null) return 0;
        return computeReferralSpendAmount({
            available,
            payableRub: beforeWallet.payableTotal,
            spendCapPercent: referralSpendCapPercent,
            enabled: true,
        });
    }, [
        isAuth,
        useReferralWallet,
        referralWalletAvailable,
        referralSpendCapPercent,
        lines,
        effectiveShippingRub,
        shippingLoading,
        shippingError,
    ]);

    const payable = useMemo(
        () =>
            calcPayableTotals({
                lines,
                voucherDiscount: useReferralWallet ? 0 : voucherDiscount,
                voucherKind: useReferralWallet ? null : voucherKind,
                referralWalletAmount,
                shippingRub: effectiveShippingRub,
                shippingLoading,
                shippingError,
            }),
        [
            lines,
            voucherDiscount,
            voucherKind,
            useReferralWallet,
            referralWalletAmount,
            effectiveShippingRub,
            shippingLoading,
            shippingError,
        ],
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
            cdekShippingLoading: shippingLoading,
            cdekShippingError: shippingError,
            shippingQuoteMeta,
            shippingQuoteClientEstimateRub,
            freePvzShippingApplied,
            needsAddressClarification: addressNeedsClarification,
            payable,
        }),
        [
            selectedAddress,
            applySavedAddress,
            clearSelectedAddress,
            checkoutEmail,
            effectiveShippingRub,
            shippingLoading,
            shippingError,
            shippingQuoteMeta,
            shippingQuoteClientEstimateRub,
            freePvzShippingApplied,
            addressNeedsClarification,
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
