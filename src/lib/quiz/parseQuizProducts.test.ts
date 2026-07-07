import { describe, expect, it } from 'vitest';
import { extractProductSlugs, splitQuizIntroAndProducts } from './parseQuizProducts';

const FACE_EDEMA_PLAIN = `Если у вас есть чувствительность, мы рекомендуем поработать сначала с ней по программе "для чувствительной кожи", восстановить кожный барьер, а уже через 30 дней начать вводить продукты для работы с отечностью.Этот дуэт создан для тех, кто хочет убрать отечность, улучшить микроциркуляцию и вернуть коже свежий, подтянутый вид. Мы рекомендуем его использовать после того, как ваш кожный барьер будет восстановлен и кожа станет менее чувствительной.Так как вы отмечали повышенную чувствительность, советуем начать интеграцию этих средств постепенно или добавить их в уход примерно через месяц после восстановления барьера.*Средство*: [лимфодренажный тоник](https://miraflores-shop.ru/magazin/product/limfodrenazhnyj-tonic-140?utm_source=tg&utm_medium=bot)Необходимый этап после очищения.*Средство*: [жидкие патчи для век](https://miraflores-shop.ru/magazin/product/mini-versiya-15-ml-patchi-dlya-vek-zhidkie?utm_source=tg&utm_medium=bot)Smart-продукт.`;

describe('parseQuizProducts', () => {
  it('extracts product slugs from face_edema text', () => {
    expect(extractProductSlugs(FACE_EDEMA_PLAIN)).toEqual([
      'limfodrenazhnyj-tonic-140',
      'mini-versiya-15-ml-patchi-dlya-vek-zhidkie',
    ]);
  });

  it('splits intro text before product sections with remedy marker', () => {
    const { introHtml, productSlugs } = splitQuizIntroAndProducts('', FACE_EDEMA_PLAIN);

    expect(productSlugs).toHaveLength(2);
    expect(introHtml).toContain('чувствительность');
    expect(introHtml).not.toContain('лимфодренажный тоник');
    expect(introHtml).not.toContain('/product/');
  });

  it('splits intro text before bare product URLs', () => {
    const plain = `Вводный текст про отёчность.

https://miraflores-shop.com/product/tonik-essentsiia-limfodrinazhnyi-oduvanchik-i-iva

Описание тоника.

https://miraflores-shop.com/product/essentsiia-s-meristemnymi-ekstraktami-i-peptidami

Описание эссенции.`;

    const { introHtml, productSlugs } = splitQuizIntroAndProducts('', plain);

    expect(productSlugs).toEqual([
      'tonik-essentsiia-limfodrinazhnyi-oduvanchik-i-iva',
      'essentsiia-s-meristemnymi-ekstraktami-i-peptidami',
    ]);
    expect(introHtml).toContain('Вводный текст');
    expect(introHtml).not.toContain('/product/');
    expect(introHtml).not.toContain('Описание тоника');
    expect(introHtml).not.toContain('Описание эссенции');
  });
});
