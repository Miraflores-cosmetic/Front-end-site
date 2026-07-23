import { describe, expect, it } from 'vitest';
import {
  hasNaboryCategoryLink,
  stripNaboryLinkFromHtml,
  stripNaboryLinkFromPlain,
} from './parseEndFaceCare';

describe('parseEndFaceCare', () => {
  it('detects nabory category link', () => {
    expect(hasNaboryCategoryLink('https://miraflores-shop.com/category/nabory')).toBe(true);
    expect(hasNaboryCategoryLink('Приятного ухода!')).toBe(false);
  });

  it('strips nabory URL from plain text', () => {
    const plain =
      'Все средства в мини-формате. Приятного ухода! HTTPS://MIRAFLORES-SHOP.COM/CATEGORY/NABORY';
    expect(stripNaboryLinkFromPlain(plain)).toBe(
      'Все средства в мини-формате. Приятного ухода!',
    );
  });

  it('strips nabory link from html', () => {
    const html =
      '<p>Выгодные наборы</p><p><a href="https://miraflores-shop.com/category/nabory">Наборы</a></p>';
    expect(stripNaboryLinkFromHtml(html)).toBe('<p>Выгодные наборы</p>');
  });
});
