import React from 'react';
import Description from '@/components/bestseller-card/bestseller-product-desription/Description';
import { DetailItem } from '@/components/bestseller-card/best-product-detail/ProductDetails';
import { ProductSliceItem } from '@/types/productSlice';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';

const TabContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ overflow: 'visible', maxHeight: 'none' }}>{children}</div>
);

function asHtml(value?: string | null): string {
  if (!value?.trim()) return '';
  return sanitizeCmsHtml(editorJsToHtml(value));
}

/** Строка характеристик PDP — без HTML-тегов (иначе React покажет `<p>…</p>` текстом). */
function asPlainDetail(value?: string | null): string {
  const html = asHtml(value);
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function generateProductDetails(product: ProductSliceItem | null): DetailItem[] {
  if (!product) return [];

  const details: DetailItem[] = [];
  const push = (label: string, value?: string | null) => {
    const text = asPlainDetail(value);
    if (text) details.push({ label, value: text });
  };

  push('тип продукта', product.productTypeName);
  const careTag = (product.catalogTags || []).find((t) =>
    t.slug?.startsWith('care-stage-') && !t.slug.includes('vse-etapy'),
  );
  if (careTag?.name) push('этап', careTag.name);
  push('для чего', product.purpose);
  push('срок годности', product.shelfLife);
  push('хранение', product.storageHtml);

  return details;
}

type TabOption = {
  id: string;
  label: string;
  price: number;
  Content: React.FC;
};

/** Табы PDP: 1) Описание, далее каждое доп. поле — отдельный таб. */
export const generateBestsellerTabsOptions = (product: ProductSliceItem | null): TabOption[] => {
  if (!product) return [];

  const options: TabOption[] = [];
  const descriptionHtml = asHtml(product.description);
  const productDetails = generateProductDetails(product);

  if (descriptionHtml || productDetails.length > 0) {
    options.push({
      id: 'opt1',
      label: 'Описание',
      price: 0,
      Content: () => <Description description={descriptionHtml} details={productDetails} />,
    });
  }

  const extraTabs: Array<{ id: string; label: string; html?: string | null }> = [
    { id: 'opt2', label: 'Действие и эффект', html: product.actionEffectHtml },
    { id: 'opt3', label: 'Состав', html: product.compositionHtml },
    { id: 'opt4', label: 'Способ применения', html: product.applicationHtml },
    { id: 'opt5', label: 'Важно знать!', html: product.importantNoteHtml },
    { id: 'opt6', label: 'Комментарий Miraflores', html: product.mirafloresNoteHtml },
  ];

  for (const tab of extraTabs) {
    const text = asHtml(tab.html);
    if (!text) continue;
    options.push({
      id: tab.id,
      label: tab.label,
      price: 0,
      Content: () => (
        <TabContent>
          <div dangerouslySetInnerHTML={{ __html: text }} />
        </TabContent>
      ),
    });
  }

  return options;
};
