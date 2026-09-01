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

function textFromEditorJsOrPlain(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const blockText = parsed?.blocks?.[0]?.data?.text;
        if (typeof blockText === 'string' && blockText.trim()) return blockText;
      } catch {
        /* plain text */
      }
    }
    return trimmed;
  }
  if (typeof raw === 'object') {
    const blockText = (raw as { blocks?: Array<{ data?: { text?: string } }> })?.blocks?.[0]
      ?.data?.text;
    if (typeof blockText === 'string') return blockText;
  }
  return '';
}

/**
 * «Описание в карточке товара» (Jcos shortDescription / атрибут opisanie-v-kartochke-tovara).
 */
export function extractProductCardDescription(
  productNode: {
    attributes?: Array<{
      attribute?: { slug?: string; name?: string };
      values?: Array<{ plainText?: string; name?: string }>;
    }>;
    shortDescription?: string | null;
    description?: unknown;
  } | null | undefined,
  options?: { preserveHtml?: boolean },
): string {
  if (!productNode) return '';

  const attrs = productNode.attributes;
  if (Array.isArray(attrs)) {
    const descAttr = attrs.find((attr) => {
      const slug = (attr.attribute?.slug || '').toLowerCase();
      const name = (attr.attribute?.name || '').toLowerCase();
      return (
        slug === 'opisanie-v-kartochke-tovara' ||
        name.includes('описание в карточке') ||
        name === 'описание в карточке товара'
      );
    });
    const fromAttr =
      descAttr?.values?.[0]?.plainText || descAttr?.values?.[0]?.name || '';
    if (fromAttr.trim()) {
      return sanitizeProductCardDescription(fromAttr, options);
    }
  }

  const fromShort = textFromEditorJsOrPlain(productNode.shortDescription);
  if (fromShort) {
    return sanitizeProductCardDescription(fromShort, options);
  }

  const fromDesc = textFromEditorJsOrPlain(productNode.description);
  return sanitizeProductCardDescription(fromDesc, options);
}
