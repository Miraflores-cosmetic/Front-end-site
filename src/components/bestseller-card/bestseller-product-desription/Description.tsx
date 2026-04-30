// Description.tsx
import React from 'react';
import ProductDetails, {
  DetailItem
} from '@/components/bestseller-card/best-product-detail/ProductDetails';
import { editorJsToHtml } from '@/utils/editorJsParser';
import styles from './Description.module.scss';

interface DescriptionProps {
  description: string;
  details: DetailItem[];
}

const Description: React.FC<DescriptionProps> = ({ description, details }) => {
  const normalizeTextToHtml = (text: string) => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return '';

    const isBullet = (l: string) => /^[-—•]\s+/.test(l);
    const toBullet = (l: string) => l.replace(/^[-—•]\s+/, '').trim();

    let html = '';
    let inList = false;

    const closeList = () => {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
    };

    for (const line of lines) {
      if (isBullet(line)) {
        if (!inList) {
          html += '<ul>';
          inList = true;
        }
        html += `<li>${toBullet(line)}</li>`;
        continue;
      }
      closeList();
      html += `<p>${line}</p>`;
    }

    closeList();
    return html;
  };

  // Преобразуем описание в HTML, если это EditorJS формат или markdown
  const getDescriptionHtml = () => {
    if (!description) return '';
    
    // Если описание уже содержит HTML теги, возвращаем как есть
    if (description.includes('<') && description.includes('>')) {
      return description;
    }
    
    // Проверяем, является ли описание JSON (EditorJS формат)
    if (typeof description === 'string' && description.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(description);
        return editorJsToHtml(parsed);
      } catch (e) {
        // Если не JSON, обрабатываем как обычный текст с markdown
        return normalizeTextToHtml(description);
      }
    }
    
    // Если это обычный текст, обрабатываем markdown и переносы строк
    return normalizeTextToHtml(description);
  };

  return (
    <div className={styles.descContainer}>
      {description && (
        <div 
          className={styles.desc}
          dangerouslySetInnerHTML={{ __html: getDescriptionHtml() }}
        />
      )}
      {details.length > 0 && (
        <div>
          <ProductDetails details={details} />
        </div>
      )}
    </div>
  );
};

export default Description;
