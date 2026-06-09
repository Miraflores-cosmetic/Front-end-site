/** Декодирует HTML-сущности из текста атрибутов Saleor (plainText / rich text). */
export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ');
}

/**
 * Нормализует описание для карточки товара: декодирует &nbsp; и пр., убирает хвостовые пробелы.
 * preserveHtml — оставить inline-теги (<b> и т.д.) для dangerouslySetInnerHTML в карточке.
 */
export function sanitizeProductCardDescription(
  value?: string | null,
  options?: { preserveHtml?: boolean },
): string {
  if (!value?.trim()) return '';

  let text = value.trim();

  if (!options?.preserveHtml) {
    text = text.replace(/<[^>]+>/g, '');
  }

  text = decodeHtmlEntities(text);
  text = text.replace(/[\s\u00A0\u202F]+$/g, '').replace(/^[\s\u00A0\u202F]+/g, '');

  return text;
}
