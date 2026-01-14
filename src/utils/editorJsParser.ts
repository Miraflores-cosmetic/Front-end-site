/**
 * Утилита для преобразования Editor.js JSON в HTML
 */

export function editorJsToHtml(data: any): string {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse JSON string:', e);
      return '';
    }
  }

  if (!data || !data.blocks || !Array.isArray(data.blocks)) {
    return '';
  }

  // Функция для обработки markdown-разметки и HTML тегов в тексте
  const processMarkdown = (text: string): string => {
    if (!text) return '';
    
    // Проверяем, есть ли уже HTML теги в тексте
    const hasHtmlTags = /<[^>]+>/.test(text);
    
    // Если уже есть HTML теги, не обрабатываем markdown, только добавляем недостающие
    if (hasHtmlTags) {
      // Оставляем HTML как есть, но можем добавить обработку markdown для частей без HTML
      return text;
    }
    
    // Если нет HTML тегов, обрабатываем markdown
    let processed = text;
    
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
