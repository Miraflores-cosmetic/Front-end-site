'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import styles from '../Category.module.scss';
import Footer from '@/components/Footer/Footer';
import { SpinnerLoader } from '@/components/spinner/SpinnerLoader';
import footerImage from '@/assets/images/footer-img.png';
import TabBar from '@/components/tab-bar/TabBar';
import { AnimatePresence } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
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

const LazyComponent: React.FC = () => {
  const { slug } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const isGiftCertificatesCategory = slug === GIFT_CERTIFICATES_CATEGORY_SLUG;

  const items = useSelector((state: RootState) => state.nav.items);
  const { title, description, tabs, subTabs, activeTabSlug, activeSubTabSlug, products, loading, loadingMore, productsFetched, pageInfo } =
    useSelector((state: RootState) => state.category);

  const isMobile = useScreenMatch(756);
  const PAGE_SIZE = 12;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Загружаем 1-й уровень табов (дети корневой категории по slug из URL)
  useEffect(() => {
    if (!slug) return;
    dispatch(resetCategoryState());
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

    dispatch(
      getCategoryProducts({
        slug: slugToLoad,
        first: PAGE_SIZE,
        after: null,
        append: false
      })
    );
  }, [activeSubTabSlug, activeTabSlug, subTabs.length, slug, dispatch]);

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
      dispatch(setActiveTabSlug('ALL'));
      return;
    }
    const tab = tabs.find(t => t.name === name);
    if (!tab) return;
    dispatch(setActiveTabSlug(tab.slug));
  };

  const handleSubTabChange = (name: string) => {
    // Если выбрано "ВСЕ", устанавливаем специальное значение
    if (name === 'ВСЕ') {
      dispatch(setActiveSubTabSlug('ALL'));
      return;
    }

    const tab = subTabs.find(t => t.name === name);
    if (!tab) return;
    dispatch(setActiveSubTabSlug(tab.slug));
  };
  // Показываем лоадер, пока список пуст и мы либо грузим, либо ещё не получали ответ по продуктам
  if (products.length === 0 && (loading || loadingMore || !productsFetched)) {
    return (
      <div className={styles.categoryLoader}>
        <SpinnerLoader />
      </div>
    );
  }

  return (
    <>
      <p className={styles.title}>{items.find(item => item.category.slug === slug)?.name}</p>
      {!isGiftCertificatesCategory && (
        <>
          <TabBar
            tabs={['ВСЕ', ...tabs.map(t => t.name).reverse()]}
            active={activeTabSlug === 'ALL' ? 'ВСЕ' : tabs.find(t => t.slug === activeTabSlug)?.name}
            onChange={handleTopTabChange}
          />
          {activeTabSlug !== 'ALL' && subTabs.length > 0 && (
            <TabBar
              tabs={['ВСЕ', ...subTabs.map(t => t.name).reverse()]}
              active={activeSubTabSlug === 'ALL' || !activeSubTabSlug
                ? 'ВСЕ'
                : subTabs.find(t => t.slug === activeSubTabSlug)?.name}
              onChange={handleSubTabChange}
            />
          )}
        </>
      )}

      {!isMobile && !isGiftCertificatesCategory && (
        <div>
          <h2 className={styles.subtitle}>{title}</h2>
          <p className={styles.description}>{description}</p>
        </div>
      )}

      {products.length > 0 ? (
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
                    <Link
                      to={'/category/' + item.category.slug}
                      className={styles.imagesLink}
                    >
                      <img alt="" src={item.category.backgroundImage.url} className={styles.slideImage} />
                      <div className={styles.discountWrapper}>
                        <p className={styles.name}>{item.name}</p>
                      </div>
                    </Link>
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
