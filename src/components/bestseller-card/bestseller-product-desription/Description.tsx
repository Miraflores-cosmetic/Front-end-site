// Description.tsx
import React from 'react';
import ProductDetails, {
  DetailItem
} from '@/components/bestseller-card/best-product-detail/ProductDetails';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
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

    let html = '';
    if (description.includes('<') && description.includes('>')) {
      html = description;
    } else if (typeof description === 'string' && description.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(description);
        html = editorJsToHtml(parsed);
      } catch {
        html = normalizeTextToHtml(description);
      }
    } else {
      html = normalizeTextToHtml(description);
    }
    return sanitizeCmsHtml(html);
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
