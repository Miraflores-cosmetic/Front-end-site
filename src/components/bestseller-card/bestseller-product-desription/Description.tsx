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
        return description.replace(/\n/g, '<br>');
      }
    }
    
    // Если это обычный текст, обрабатываем markdown и переносы строк
    return description.replace(/\n/g, '<br>');
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
