import React from 'react';
import Description from '@/components/bestseller-card/bestseller-product-desription/Description';
import { DetailItem } from '@/components/bestseller-card/best-product-detail/ProductDetails';
import { Product } from '@/types/types';
import { ProductSliceItem} from '@/types/productSlice';
import { editorJsToHtml } from '@/utils/editorJsParser';

export interface AttributeValue {
  boolean: boolean | null;
  date: string | null;
  dateTime: string | null;
  externalReference: string | null;
  inputType: string;
  name: string;
  plainText: string | null;
  reference: string | null;
  richText: any;
  slug: string;
}

export interface Attribute {
  attribute: {
    id: string;
    name: string;
    slug: string;
    metadata: any[];
  };
  values: AttributeValue[];
}

const getAttributeBySlug = (product: ProductSliceItem | null, slug: string) => {
  if (!product?.attributes) return null;
  const attr = product.attributes.find((a: any) => a.attribute.slug === slug);
  return attr?.values?.[0] || null;
};

const editorJsToText = (data: any): string => {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return data;
    }
  }

  if (!data || !data.blocks || !Array.isArray(data.blocks)) {
    return '';
  }

  return data.blocks
    .map((block: any) => {
      if (block.type === 'paragraph') {
        const text = block.data?.text || '';
        const temp = document.createElement('div');
        temp.innerHTML = text;
        return temp.textContent || temp.innerText || '';
      }
      if (block.type === 'list') {
        return block.data?.items?.join(', ') || '';
      }
      if (block.type === 'header') {
        return block.data?.text || '';
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
};

const getTextFromAttribute = (attrValue: AttributeValue | null, useHtml: boolean = true): string => {
  if (!attrValue) return '';

  // Сначала проверяем richText, так как он содержит полный текст (может быть обрезан в plainText)
  // Используем editorJsToHtml для сохранения форматирования
  if (attrValue.richText) {
    try {
      // Пробуем преобразовать в HTML для сохранения форматирования
      const parsed = typeof attrValue.richText === 'string' 
        ? JSON.parse(attrValue.richText) 
        : attrValue.richText;
      return useHtml ? editorJsToHtml(parsed) : editorJsToText(parsed);
    } catch (e) {
      // Если не получается, используем обычный текст
      return editorJsToText(attrValue.richText);
    }
  }

  // Если richText нет, используем plainText
  if (attrValue.plainText) return attrValue.plainText;

  return attrValue.name || '';
};

const generateProductDetails = (product: ProductSliceItem | null): DetailItem[] => {
  if (!product) return [];

  const details: DetailItem[] = [];

  const detailsMap = [
    { slug: 'product_type', label: 'тип продукта' },
    { slug: 'care_stage', label: 'этап' },
    { slug: 'fragrance', label: 'аромат' },
    { slug: 'purpose', label: 'для чего' },
    { slug: 'shelf_life', label: 'срок годности' },
    { slug: 'storage', label: 'хранение' }
  ];

  detailsMap.forEach(({ slug, label }) => {
    const attr = getAttributeBySlug(product, slug);
    if (attr) {
      const value = getTextFromAttribute(attr);
      if (value) {
        details.push({ label, value });
      }
    }
  });

  return details;
};

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ overflow: 'visible', maxHeight: 'none' }}>{children}</div>
);

export const generateBestsellerTabsOptions = (product: ProductSliceItem | null) => {
  if (!product) return [];

  const options: any[] = [];

  // Получаем длинное описание из product.description (EditorJS формат)
  // Используем editorJsToHtml для сохранения форматирования
  const fullDescriptionHtml = product.description 
    ? (() => {
        try {
          const parsed = typeof product.description === 'string' 
            ? JSON.parse(product.description) 
            : product.description;
          return editorJsToHtml(parsed);
        } catch (e) {
          return editorJsToText(product.description);
        }
      })()
    : '';
  
  // Если длинного описания нет, пробуем короткое из атрибутов (fallback)
  const descriptionHtml = fullDescriptionHtml || (() => {
    const shortDesc = getAttributeBySlug(product, 'short_description');
    const productCardDesc = getAttributeBySlug(product, 'product_card_description');
    return getTextFromAttribute(shortDesc) || getTextFromAttribute(productCardDesc) || '';
  })();
  
  const productDetails = generateProductDetails(product);

  options.push({
    id: 'opt1',
    label: 'Описание',
    price: 0,
    Content: () => <Description description={descriptionHtml} details={productDetails} />
  });

  const actionEffect = getAttributeBySlug(product, 'action_effect');
  if (actionEffect) {
    const text = getTextFromAttribute(actionEffect);
    if (text) {
      options.push({
        id: 'opt2',
        label: 'Действие и эффект',
        price: 0,
        Content: () => (
          <TabContent>
            <div dangerouslySetInnerHTML={{ __html: text }} />
          </TabContent>
        )
      });
    }
  }

  const ingredients = getAttributeBySlug(product, 'ingredients');
  if (ingredients) {
    const text = getTextFromAttribute(ingredients);
    if (text) {
      options.push({
        id: 'opt3',
        label: 'Состав',
        price: 0,
        Content: () => (
          <TabContent>
            <div dangerouslySetInnerHTML={{ __html: text }} />
          </TabContent>
        )
      });
    }
  }

  const howToUse = getAttributeBySlug(product, 'how_to_use');
  if (howToUse) {
    const text = getTextFromAttribute(howToUse);
    if (text) {
      options.push({
        id: 'opt4',
        label: 'Способ применения',
        price: 0,
        Content: () => (
          <TabContent>
            <div dangerouslySetInnerHTML={{ __html: text }} />
          </TabContent>
        )
      });
    }
  }

  const importantNote = getAttributeBySlug(product, 'important_note');
  if (importantNote) {
    const text = getTextFromAttribute(importantNote);
    if (text) {
      options.push({
        id: 'opt5',
        label: 'Важно знать!',
        price: 0,
        Content: () => (
          <TabContent>
            <div dangerouslySetInnerHTML={{ __html: text }} />
          </TabContent>
        )
      });
    }
  }

  const mirafloresNote = getAttributeBySlug(product, 'miraflores_note');
  if (mirafloresNote) {
    const text = getTextFromAttribute(mirafloresNote);
    if (text) {
      options.push({
        id: 'opt6',
        label: 'Комментарий Miraflores',
        price: 0,
        Content: () => (
          <TabContent>
            <div dangerouslySetInnerHTML={{ __html: text }} />
          </TabContent>
        )
      });
    }
  }

  return options;
};
