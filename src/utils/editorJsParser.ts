/**
 * Утилита для преобразования Editor.js JSON в HTML.
 * CMS/бэкенд часто отдают уже готовый HTML — его возвращаем как есть.
 */

function looksLikeHtml(value: string): boolean {
  const t = value.trim();
  return t.startsWith('<') || (/<[a-z][\s\S]*>/i.test(t) && !t.startsWith('{'));
}

export function editorJsToHtml(data: any): string {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return '';

    if (looksLikeHtml(trimmed) || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return data;
    }

    try {
      data = JSON.parse(trimmed);
    } catch {
      return data;
    }
  }

  if (!data || !data.blocks || !Array.isArray(data.blocks)) {
    return '';
  }

  // Функция для обработки markdown-разметки и HTML тегов в тексте
  const processMarkdown = (text: string): string => {
    if (!text) return '';

    let processed = text.replace(/&nbsp;/gi, ' ');
    
    // Проверяем, есть ли уже HTML теги в тексте
    const hasHtmlTags = /<[^>]+>/.test(processed);
    
    // Если уже есть HTML теги, не обрабатываем markdown, только добавляем недостающие
    if (hasHtmlTags) {
      return processed;
    }
    
    // Преобразуем markdown ссылки [текст](url) в HTML
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Преобразуем **текст** в <strong>
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Преобразуем *текст* в <em> (только если не внутри **)
    processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
    
    return processed;
  };

  let html = '';

  data.blocks.forEach((block: any) => {
    switch (block.type) {
      case 'paragraph':
        if (block.data?.text) {
          html += `<p>${processMarkdown(block.data.text)}</p>`;
        }
        break;
      case 'header':
        const level = block.data?.level || 1;
        const headerText = block.data?.text || '';
        html += `<h${Math.min(level, 6)}>${processMarkdown(headerText)}</h${Math.min(level, 6)}>`;
        break;
      case 'list':
        const listTag = block.data?.style === 'ordered' ? 'ol' : 'ul';
        html += `<${listTag}>`;
        if (block.data?.items && Array.isArray(block.data.items)) {
          block.data.items.forEach((item: string) => {
            html += `<li>${processMarkdown(item)}</li>`;
          });
        }
        html += `</${listTag}>`;
        break;
      case 'quote':
        if (block.data?.text) {
          html += `<blockquote>${processMarkdown(block.data.text)}</blockquote>`;
        }
        break;
      case 'code':
        if (block.data?.code) {
          html += `<pre><code>${block.data.code}</code></pre>`;
        }
        break;
      case 'image':
        if (block.data?.file?.url) {
          const caption = block.data.caption || '';
          html += `<figure><img src="${block.data.file.url}" alt="${caption}" />`;
          if (caption) {
            html += `<figcaption>${processMarkdown(caption)}</figcaption>`;
          }
          html += `</figure>`;
        }
        break;
      default:
        // Для неизвестных типов блоков просто выводим текст, если он есть
        if (block.data?.text) {
          html += `<p>${processMarkdown(block.data.text)}</p>`;
        }
    }
  });

  return html;
}

/** Editor.js → plain text без DOM (безопасно в render-path / SSR). */
export function editorJsToPlainText(data: unknown): string {
  let parsed: any = data;
  if (typeof parsed === 'string') {
    const trimmed = parsed.trim();
    if (!trimmed) return '';
    if (looksLikeHtml(trimmed) || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
      return stripHtmlTags(parsed);
    }
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return stripHtmlTags(parsed);
    }
  }

  if (!parsed?.blocks || !Array.isArray(parsed.blocks)) {
    return typeof data === 'string' ? stripHtmlTags(data) : '';
  }

  return parsed.blocks
    .map((block: any) => {
      if (block.type === 'paragraph' || block.type === 'header' || block.type === 'quote') {
        return stripHtmlTags(block.data?.text || '');
      }
      if (block.type === 'list' && Array.isArray(block.data?.items)) {
        return block.data.items.map((item: string) => stripHtmlTags(item)).filter(Boolean).join(', ');
      }
      if (block.data?.text) {
        return stripHtmlTags(block.data.text);
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
