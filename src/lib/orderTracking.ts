export function orderTrackingUrl(
  provider: string | null | undefined,
  tracking: string,
): string | null {
  const t = tracking.trim();
  if (!t) return null;
  const p = (provider || '').toUpperCase();
  if (p === 'CDEK') {
    return `https://www.cdek.ru/ru/tracking?order_id=${encodeURIComponent(t)}`;
  }
  if (p === 'YANDEX') {
    return `https://dostavka.yandex.ru/tracking?code=${encodeURIComponent(t)}`;
  }
  return null;
}

export function orderTrackingProviderLabel(provider: string | null | undefined): string | null {
  const p = (provider || '').toUpperCase();
  if (p === 'CDEK') return 'СДЭК';
  if (p === 'YANDEX') return 'Яндекс Доставка';
  if (p === 'PICKUP') return 'Самовывоз';
  return provider?.trim() || null;
}
