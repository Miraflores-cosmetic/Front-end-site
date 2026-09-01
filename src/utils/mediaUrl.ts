/**
 * Нормализация URL медиа → Админ панель 2.0 (/uploads).
 */
import { uploadsUrl } from '@/api/apiClient';

export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  return uploadsUrl(url) || url.trim();
}
