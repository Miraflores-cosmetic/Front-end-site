import React, { useMemo, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styles from './TotalAccordion.module.scss';
import { TotalAccordionProps } from '../types';
import userImage from '@/assets/images/userImage.webp';
import { getCartTextPage } from '@/graphql/queries/pages.service';
import { editorJsToHtml } from '@/utils/editorJsParser';
import { sanitizeCmsHtml } from '@/utils/sanitizeCmsHtml';
import { openDrawer } from '@/store/slices/drawerSlice';
import type { AppDispatch } from '@/store/store';

const TotalAccordion: React.FC<TotalAccordionProps> = ({
  total,
  goodsTotal,
  totalOld,
  totalItems,
  products,
  discount,
  promo,
  hasPayableLines = false,
  addressSelected = false,
  shippingRub = null,
  shippingLoading = false,
  shippingError = null,
  freePvzShippingApplied = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);

  const formatPrice = (price: number) => Math.round(price).toLocaleString('ru-RU');
  const itemsLabel =
    totalItems === 1 ? 'товар' : totalItems > 1 && totalItems < 5 ? 'товара' : 'товаров';

  const shippingPending = hasPayableLines && total == null;
  const headerTitle = shippingPending ? 'Товары' : 'Итого';
  const headerAmount = shippingPending ? goodsTotal : (total ?? goodsTotal);

  const shippingText = useMemo(() => {
    if (!hasPayableLines) return null;
    if (shippingLoading) return { kind: 'muted' as const, value: 'Расчёт…' };
    if (!shippingLoading && shippingError) return { kind: 'error' as const, value: shippingError };
    if (!shippingLoading && !shippingError && shippingRub != null) {
      if (freePvzShippingApplied || shippingRub === 0) {
        return { kind: 'value' as const, value: 'бесплатно' };
      }
      return { kind: 'value' as const, value: `${formatPrice(shippingRub)}₽` };
    }
    if (!shippingLoading && !shippingError && shippingRub == null && !addressSelected)
      return { kind: 'muted' as const, value: 'Выберите адрес' };
    return { kind: 'muted' as const, value: '—' };
  }, [hasPayableLines, shippingLoading, shippingError, shippingRub, addressSelected, freePvzShippingApplied]);

  useEffect(() => {
    getCartTextPage().then(page => {
      if (page && page.content) {
        try {
          const parsed = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
          const html = sanitizeCmsHtml(editorJsToHtml(parsed));
          setContent(html);
        } catch (e) {
          setContent(
            typeof page.content === 'string' ? sanitizeCmsHtml(page.content) : '',
          );
        }
      }
    });
  }, []);

  return (
    <section className={styles.accordion}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.headerLeft}>
          <div className={styles.titleBlock}>
            <span className={styles.title}>{headerTitle}</span>
            <span className={styles.count}>
              {totalItems} {itemsLabel}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.priceRow}>
            {totalOld != null && totalOld > headerAmount && (
              <p className={styles.priceOld}>{formatPrice(totalOld)}₽</p>
            )}
            <p className={styles.priceNew}>{formatPrice(headerAmount)}₽</p>
          </div>
          <div className={`${styles.arrow} ${isOpen ? styles.open : ''}`} aria-hidden />
        </div>
      </button>

      {isOpen && (
        <article className={styles.content}>
          <section className={styles.productList}>
            <button
              type="button"
              className={styles.editCartBtn}
              onClick={() => dispatch(openDrawer('basket'))}
            >
              Изменить корзину
            </button>
            {products.map(item => (
              <div key={item.id} className={styles.productItem}>
                <div className={styles.imageWrapper}>
                  <div className={styles.countWrapper}>
                    <p className={styles.count}>{item.quantity ?? 1}</p>
                  </div>
                  <img src={item.image} alt={item.name} className={styles.image} />
                </div>
                <div className={styles.productInfo}>
                  <div className={styles.nameSize}>
                    <p className={styles.name}>{item.name}</p>
                    {item.size ? <p className={styles.size}>{item.size}</p> : null}
                  </div>
                  <div className={styles.priceBlock}>
                    {item.isGift ? (
                      <span className={styles.gift}>Подарок</span>
                    ) : (
                      <div className={styles.itemPriceRow}>
                        <p className={styles.itemPriceNew}>{formatPrice(item.price)}₽</p>
                        {item.oldPrice != null && item.oldPrice > item.price && (
                          <p className={styles.itemPriceOld}>{formatPrice(item.oldPrice)}₽</p>
                        )}
                        {item.discount && <span className={styles.discount}>{item.discount}</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>
          <section className={styles.addPromo}>
            <p className={styles.discountPromo}>
              Скидка по промо-кодам НЕ РАСПРОСТРАНЯЕТСЯ на товары уже со скидками, наборы, товары не
              нашего производства и электронные продукты.
            </p>
          </section>

          {/* <section className={styles.summary}>
            <p>
              Скидка: <span>-{discount}₽</span>
            </p>
            <p>
              Промокод: <span>-{promo}₽</span>
            </p>
          </section> */}

          <section className={styles.sectionSumDiscount}>
            <div className={styles.sumWrapper}>
              <p className={styles.sum}>
                {shippingPending ? 'Товары' : 'К оплате'} • {totalItems} {itemsLabel}
              </p>
              <div className={styles.price}>
                <p className={styles.priceNew}>{formatPrice(headerAmount)}₽</p>
                {totalOld != null && totalOld > headerAmount && (
                  <p className={styles.priceOld}>{formatPrice(totalOld)}₽</p>
                )}
              </div>
            </div>
            {Boolean(discount && discount > 0) && (
              <div className={styles.discountWrapper}>
                <p className={styles.name}>Скидка</p>
                <p className={styles.value}>-{formatPrice(discount || 0)}₽</p>
              </div>
            )}
            {Boolean(promo && promo > 0) && (
              <div className={styles.promocodeWrapper}>
                <p className={styles.name}>Промокод / сертификат</p>
                <p className={styles.value}>-{formatPrice(promo || 0)}₽</p>
              </div>
            )}
            {hasPayableLines && shippingText && (
              <div className={styles.shippingWrapper}>
                <p className={styles.name}>Доставка</p>
                <div className={styles.shippingValueCol}>
                  <p
                    className={
                      shippingText.kind === 'error'
                        ? styles.shippingValueError
                        : shippingText.kind === 'muted'
                          ? styles.shippingValueMuted
                          : styles.shippingValue
                    }
                  >
                    {shippingText.value}
                  </p>
                </div>
              </div>
            )}
            {shippingPending && (
              <div className={styles.shippingWrapper}>
                <p className={styles.name}>К оплате</p>
                <p className={styles.shippingValueMuted}>после расчёта доставки</p>
              </div>
            )}
          </section>

          <section className={styles.infoWrapper}>
            <div className={styles.userWrapper}>
              <img className={styles.userImage} src={userImage} alt='user image' />
              <div className={styles.userInfo}>
                <p className={styles.userName}>Дмитрий Патрацкий</p>
                <p className={styles.userRole}>CEO</p>
              </div>
            </div>
            <div className={styles.textsWrapper}>
              {content ? (
                <div
                  className={styles.dynamicContent}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              ) : (
                <>
                  <p className={styles.text}>
                    Многие наши товары изготавливаются непосредственно после заказа, поэтому срок от
                    приёма заказа до его отправки такого заказа составляет <span>3-5 рабочих дня</span>{' '}
                    после 100% оплаты.
                  </p>
                  <p className={styles.text}>
                    После обработки заказа нашими операторами, информация о заказе будет отправлена на
                    e-mail, указанный при оформлении заказа
                  </p>
                </>
              )}
            </div>
          </section>
        </article>
      )}
    </section>
  );
};

export default TotalAccordion;
