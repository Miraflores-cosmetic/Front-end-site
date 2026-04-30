'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import styles from '../Category.module.scss';
import Footer from '@/components/Footer/Footer';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import footerImage from '@/assets/images/footer-img.png';
import TabBar from '@/components/tab-bar/TabBar';
import { AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import AppLink from '@/components/AppLink/AppLink';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import {
  getCategoryProducts,
  getCategoryTabs,
  getSubCategoryTabs,
  resetCategoryState,
  setActiveSubTabSlug,
  setActiveTabSlug
} from '@/store/slices/categorySlice';

/** На странице этой категории скрываем табы и подзаголовок (подстраница «Подарочные сертификаты»). */
const GIFT_CERTIFICATES_CATEGORY_SLUG =
  import.meta.env.VITE_HIDE_HEADER_CATEGORY_SLUG || 'podarochnye-sertifikaty';

const TAB_QUERY = 'tab';
const SUBTAB_QUERY = 'subtab';

const LazyComponent: React.FC = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const isGiftCertificatesCategory = slug === GIFT_CERTIFICATES_CATEGORY_SLUG;

  const items = useSelector((state: RootState) => state.nav.items);
  const { description, tabs, subTabs, activeTabSlug, activeSubTabSlug, products, loading, loadingMore, productsFetched, pageInfo } =
    useSelector((state: RootState) => state.category);

  const isMobile = useScreenMatch();
  const PAGE_SIZE = 12;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  /** Чтобы не дергать getCategoryProducts дважды при появлении subTabs (0 → N) для того же slug */
  const lastProductsSlugLoadedRef = useRef<string | null>(null);
  /** Монотонный id списка: устаревшие ответы getCategoryProducts отбрасываются в categorySlice */
  const listRequestIdRef = useRef(0);

  const syncTabParamsToUrl = useCallback(
    (next: { tab?: 'ALL' | string; subtab?: 'ALL' | string | null }) => {
      if (isGiftCertificatesCategory) return;
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next.tab !== undefined) {
            if (next.tab === 'ALL') p.delete(TAB_QUERY);
            else p.set(TAB_QUERY, next.tab);
          }
          if (next.subtab !== undefined) {
            if (next.subtab === null || next.subtab === 'ALL') p.delete(SUBTAB_QUERY);
            else p.set(SUBTAB_QUERY, next.subtab);
          }
          return p;
        },
        { replace: true }
      );
    },
    [isGiftCertificatesCategory, setSearchParams]
  );

  // Восстанавливаем верхний таб из ?tab= (в т.ч. после «Назад» из карточки товара)
  useEffect(() => {
    if (isGiftCertificatesCategory || !slug || tabs.length === 0 || activeTabSlug === null) return;

    const raw = searchParams.get(TAB_QUERY);
    const want: string | 'ALL' =
      !raw || raw.toLowerCase() === 'all'
        ? 'ALL'
        : tabs.some(t => t.slug === raw)
          ? raw
          : 'ALL';

    if (want !== activeTabSlug) {
      dispatch(setActiveTabSlug(want));
    }
  }, [isGiftCertificatesCategory, slug, tabs, searchParams, activeTabSlug, dispatch]);

  // Восстанавливаем подтаб из ?subtab=
  useEffect(() => {
    if (
      isGiftCertificatesCategory ||
      !slug ||
      activeTabSlug === null ||
      activeTabSlug === 'ALL'
    ) {
      return;
    }

    const raw = searchParams.get(SUBTAB_QUERY);
    const want: string | 'ALL' =
      !raw || raw.toLowerCase() === 'all'
        ? 'ALL'
        : subTabs.some(t => t.slug === raw)
          ? raw
          : 'ALL';

    const currentSub = activeSubTabSlug ?? 'ALL';
    if (want !== currentSub) {
      dispatch(setActiveSubTabSlug(want));
    }
  }, [
    isGiftCertificatesCategory,
    slug,
    activeTabSlug,
    subTabs,
    searchParams,
    activeSubTabSlug,
    dispatch
  ]);

  // Загружаем 1-й уровень табов (дети корневой категории по slug из URL)
  useEffect(() => {
    if (!slug) return;
    lastProductsSlugLoadedRef.current = null;
    listRequestIdRef.current = 0;
    dispatch(resetCategoryState(slug));
    dispatch(getCategoryTabs({ first: 50, slug }));
  }, [slug, dispatch]);


  // Когда выбран таб 1-го уровня (не «ВСЕ») — загружаем его детей (2-й уровень)
  useEffect(() => {
    if (!activeTabSlug || activeTabSlug === 'ALL') return;
    dispatch(getSubCategoryTabs(activeTabSlug));
  }, [activeTabSlug, dispatch]);

  // Загружаем продукты: «ВСЕ» — по корневой категории (slug из URL), иначе по выбранному табу/подтабу
  useEffect(() => {
    if (!activeTabSlug) return;

    const slugToLoad = activeTabSlug === 'ALL'
      ? (slug || '')
      : (activeSubTabSlug === 'ALL' || !activeSubTabSlug || subTabs.length === 0
        ? activeTabSlug
        : activeSubTabSlug);

    if (!slugToLoad) return;

    // Уже загрузили товары по этому slug в текущем цикле (например эффект повторился из‑за subTabs.length)
    if (productsFetched && lastProductsSlugLoadedRef.current === slugToLoad) {
      return;
    }

    lastProductsSlugLoadedRef.current = slugToLoad;
    const listRequestId = ++listRequestIdRef.current;
    dispatch(
      getCategoryProducts({
        slug: slugToLoad,
        first: PAGE_SIZE,
        after: null,
        append: false,
        listRequestId
      })
    );
  }, [activeSubTabSlug, activeTabSlug, subTabs.length, slug, dispatch, productsFetched]);

  const canLoadMore = useMemo(() => {
    return !!activeTabSlug && !!pageInfo?.hasNextPage && !loading && !loadingMore;
  }, [activeTabSlug, pageInfo?.hasNextPage, loading, loadingMore]);

  const slugToLoad = activeTabSlug === 'ALL'
    ? slug
    : (activeSubTabSlug === 'ALL' || !activeSubTabSlug ? activeTabSlug : activeSubTabSlug);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) return;

        if (!canLoadMore) return;

        if (slugToLoad) {
          dispatch(
            getCategoryProducts({
              slug: slugToLoad,
              first: PAGE_SIZE,
              after: pageInfo?.endCursor ?? null,
              append: true
            })
          );
        }
      },
      {
        root: null,
        rootMargin: '600px',
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [dispatch, canLoadMore, slugToLoad, pageInfo?.endCursor]);


  const handleTopTabChange = (name: string) => {
    if (name === 'ВСЕ') {
      if (activeTabSlug === 'ALL') return;
      dispatch(setActiveTabSlug('ALL'));
      syncTabParamsToUrl({ tab: 'ALL', subtab: 'ALL' });
      return;
    }
    const tab = tabs.find(t => t.name === name);
    if (!tab?.slug) return;
    if (activeTabSlug === tab.slug) return;
    dispatch(setActiveTabSlug(tab.slug));
    syncTabParamsToUrl({ tab: tab.slug, subtab: 'ALL' });
  };

  const handleSubTabChange = (name: string) => {
    // Если выбрано "ВСЕ", устанавливаем специальное значение
    if (name === 'ВСЕ') {
      const current = activeSubTabSlug ?? 'ALL';
      if (current === 'ALL') return;
      dispatch(setActiveSubTabSlug('ALL'));
      syncTabParamsToUrl({ subtab: 'ALL' });
      return;
    }

    const tab = subTabs.find(t => t.name === name);
    if (!tab?.slug) return;
    if (activeSubTabSlug === tab.slug) return;
    dispatch(setActiveSubTabSlug(tab.slug));
    syncTabParamsToUrl({ subtab: tab.slug });
  };

  /** Подзаголовок дублирует выбранный подтаб / таб (не имя категории из GraphQL — оно «прыгает» между запросами). */
  const subtitleHeading = useMemo(() => {
    if (activeTabSlug === 'ALL' || !activeTabSlug) return '';
    const sub =
      activeSubTabSlug &&
      activeSubTabSlug !== 'ALL' &&
      subTabs.find(s => s.slug === activeSubTabSlug)?.name;
    if (sub) return sub;
    return tabs.find(t => t.slug === activeTabSlug)?.name ?? '';
  }, [activeTabSlug, activeSubTabSlug, tabs, subTabs]);
  const showInitialSkeletons = products.length === 0 && (loading || loadingMore || !productsFetched);

  return (
    <>
      <p className={styles.title}>{items.find(item => item.category.slug === slug)?.name}</p>
      {!isGiftCertificatesCategory && (
        <div className={styles.stickyTabs}>
          <TabBar
            // Важно: не использовать .reverse() напрямую — он мутирует массив из Redux state.
            tabs={['ВСЕ', ...tabs.map(t => t.name).slice().reverse()]}
            active={activeTabSlug === 'ALL' ? 'ВСЕ' : (tabs.find(t => t.slug === activeTabSlug)?.name ?? 'ВСЕ')}
            onChange={handleTopTabChange}
          />
          {activeTabSlug !== 'ALL' && subTabs.length > 0 && (
            <TabBar
              tabs={['ВСЕ', ...subTabs.map(t => t.name).slice().reverse()]}
              active={activeSubTabSlug === 'ALL' || !activeSubTabSlug
                ? 'ВСЕ'
                : (subTabs.find(t => t.slug === activeSubTabSlug)?.name ?? 'ВСЕ')}
              onChange={handleSubTabChange}
            />
          )}
        </div>
      )}

      {!isMobile && !isGiftCertificatesCategory && (
        <div>
          {subtitleHeading ? (
            <h2 className={styles.subtitle}>{subtitleHeading}</h2>
          ) : null}
          {description ? (
            <p className={styles.description}>{description}</p>
          ) : null}
        </div>
      )}

      {showInitialSkeletons ? (
        <section className={styles.wrapper} aria-busy="true" aria-label="Загрузка товаров">
          <AnimatePresence mode="sync">
            {Array.from({ length: isMobile ? 6 : PAGE_SIZE }).map((_, i) => (
              <BestSellerProductCard
                key={`initial-skeleton-${i}`}
                product={{} as any}
                loading={true}
              />
            ))}
          </AnimatePresence>
        </section>
      ) : products.length > 0 ? (
        <>
          <section className={styles.wrapper}>
            <AnimatePresence mode="sync">
              {products.map((product) => (
                <BestSellerProductCard key={product.id} product={product} loading={false} />
              ))}
              {loadingMore &&
                Array.from({ length: 6 }).map((_, i) => (
                  <BestSellerProductCard
                    key={`skeleton-${i}`}
                    product={{} as any}
                    loading={true}
                  />
                ))}
            </AnimatePresence>
          </section>

          {/* sentinel: когда он “виден” — подгружаем */}
          {pageInfo?.hasNextPage && (
            <div ref={loadMoreRef} style={{ height: 1 }} />
          )}

        </>
      ) : productsFetched ? (
        <section className={styles.noProductsWrapper}>
          <div className={styles.noProducts}>
            <p>в данной категории пока нет доступных продуктов</p>
          </div>
        </section>
      ) : null}




      {!isMobile && (
        <section className={styles.categoryWrapper}>
          <p className={styles.title}>КАТЕГОРИИ</p>
          <article>
            <div className={styles.imageSlider}>
              {items
                .filter((item) => item.category.slug !== slug)
                .slice(0, 4)
                .map((item) => (
                  <article className={styles.imagesWrapper} key={item.id}>
                    <AppLink
                      to={'/category/' + item.category.slug}
                      className={styles.imagesLink}
                    >
                      <img alt="" src={item.category.backgroundImage.url} className={styles.slideImage} />
                      <div className={styles.discountWrapper}>
                        <p className={styles.name}>{item.name}</p>
                      </div>
                    </AppLink>
                  </article>
                ))}
            </div>
          </article>
        </section>
      )}
      <Footer footerImage={footerImage} />
    </>
  );
};

export default LazyComponent;
