import { useEffect, useSyncExternalStore } from 'react';
import { apiFetch } from '@/api/apiClient';

export type OzonAvailability = { available: boolean; message: string | null };

const DEFAULT_OZON_UNAVAILABLE =
    'Ozon Доставка временно недоступна. Выберите другую службу доставки.';
const TTL_MS = 60_000;

/** null — статус ещё не получен: Ozon показываем (квоту всё равно проверит бэкенд). */
let state: OzonAvailability | null = null;
let fetchedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
    for (const l of listeners) l();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function isOzonAvailable(): boolean {
    return state?.available !== false;
}

export function ozonUnavailableMessage(): string {
    return state?.message || DEFAULT_OZON_UNAVAILABLE;
}

/** Ответ pickup-points/квоты уже сказал «недоступно» — обновить без лишнего запроса. */
export function setOzonAvailability(next: OzonAvailability): void {
    fetchedAt = Date.now();
    if (state?.available === next.available && state?.message === next.message) return;
    state = next;
    emit();
}

/** Ошибка сети не скрывает Ozon — остаётся последний известный статус. */
export function refreshOzonAvailability(force = false): Promise<void> {
    if (!force && state && Date.now() - fetchedAt < TTL_MS) return Promise.resolve();
    if (!inFlight) {
        inFlight = apiFetch<OzonAvailability>('/delivery/ozon/availability', { skipAuth: true })
            .then((res) => {
                setOzonAvailability({
                    available: res.available !== false,
                    message: res.message ?? null,
                });
            })
            .catch(() => undefined)
            .finally(() => {
                inFlight = null;
            });
    }
    return inFlight;
}

/** Подписка компонента на статус Ozon; первый вызов запрашивает его у API. */
export function useOzonAvailable(): boolean {
    const available = useSyncExternalStore(subscribe, isOzonAvailable, () => true);
    useEffect(() => {
        void refreshOzonAvailability();
    }, []);
    return available;
}

export function resetOzonAvailabilityForTests(): void {
    state = null;
    fetchedAt = 0;
    inFlight = null;
    emit();
}
