import { describe, expect, it } from 'vitest';
import { buildContentItemFromParts } from './contentUtils';
import { extractProductSlugs, splitQuizIntroAndProducts } from './parseQuizProducts';

const STEP_1_SPF_RICH_TEXT = {
  blocks: [
    { type: 'paragraph', data: { text: 'На основе ваших ответов мы предлагаем попробовать следующий уход:' } },
    { type: 'paragraph', data: { text: '<b>ШАГ 1. Очищение</b>' } },
    { type: 'paragraph', data: { text: 'ГИДРОФИЛЬНОЕ МАСЛО ' } },
    {
      type: 'paragraph',
      data: {
        text: 'Гидрофильное масло идеально подходит для чувствительной кожи: оно эффективно и мягко смывает макияж, SPF и загрязнения, не разрушая липидный барьер.&nbsp;В отличие от обычных средств, оно не пересушивает кожу.',
      },
    },
    {
      type: 'paragraph',
      data: {
        text: 'https://miraflores-shop.com/product/gidrofilnoe-maslo-mat-i-machekha-i-kalendula',
      },
    },
  ],
};

describe('parseQuizProducts CMS step_1_spf', () => {
  it('extracts slug and preserves rich intro from EditorJS', () => {
    const item = buildContentItemFromParts({ richText: STEP_1_SPF_RICH_TEXT });
    expect(item?.html).toBeTruthy();

    const { introHtml, productSlugs } = splitQuizIntroAndProducts(item!.html!, item!.plain!);

    expect(productSlugs).toEqual(['gidrofilnoe-maslo-mat-i-machekha-i-kalendula']);
    expect(introHtml).toContain('<b>ШАГ 1. Очищение</b>');
    expect(introHtml).not.toContain('/product/');
    expect(introHtml).not.toContain('gidrofilnoe-maslo');
  });

  it('extracts slug from anchor href in EditorJS paragraph', () => {
    const html =
      '<p>Intro</p><p><a href="https://miraflores-shop.com/product/gidrofilnoe-maslo-mat-i-machekha-i-kalendula">Масло</a></p>';
    expect(extractProductSlugs(html)).toEqual(['gidrofilnoe-maslo-mat-i-machekha-i-kalendula']);
  });
});
