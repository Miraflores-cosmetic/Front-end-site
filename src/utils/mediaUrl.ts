/**
 * Утилита для нормализации URL медиа-файлов
 * Исправляет localhost:8000 на основной домен
 */

export function normalizeMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Если URL уже полный и правильный, возвращаем как есть
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Исправляем localhost:8000 на основной домен
    const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'https://miraflores-shop.com/graphql/';
    const baseUrl = graphqlUrl.replace('/graphql/', '').replace('/graphql', '');
    
    // Заменяем localhost:8000 на основной домен
    url = url.replace(/https?:\/\/localhost:8000\//g, `${baseUrl}/`);
    url = url.replace(/https?:\/\/127\.0\.0\.1:8000\//g, `${baseUrl}/`);
    
    return url;
  }
  
  // Если URL относительный, добавляем базовый URL
  const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'https://miraflores-shop.com/graphql/';
  const baseUrl = graphqlUrl.replace('/graphql/', '').replace('/graphql', '');
  
  // Убираем начальный слеш если есть
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  
  return `${baseUrl}${cleanUrl}`;
}



