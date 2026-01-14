'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import styles from '../Category.module.scss';
import Footer from '@/components/Footer/Footer';
import footerImage from '@/assets/images/footerImage.webp';
import TabBar from '@/components/tab-bar/TabBar';
import {AnimatePresence} from 'framer-motion';
import {Link, useParams} from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { BestSellerProductCard } from '@/components/bestsellers/bestSellerCard';
import Slider from 'react-slick';
import { useScreenMatch } from '@/hooks/useScreenMatch';
import {
  getCategoryProducts,
  getCategoryTabs,
  getSubCategoryTabs,
  resetCategoryState,
  setActiveSubTabSlug,
  setActiveTabSlug
} from '@/store/slices/categorySlice';

const LazyComponent: React.FC = () => {
  const { slug } = useParams();
  const dispatch = useDispatch<AppDispatch>();

  const items = useSelector((state: RootState) => state.nav.items);
  const { title, description, tabs, subTabs, activeTabSlug, activeSubTabSlug, products, loading, pageInfo } =
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


  // Когда выбран таб 1-го уровня — загружаем его детей (2-й уровень)
  useEffect(() => {
    if (!activeTabSlug) return;
    dispatch(getSubCategoryTabs(activeTabSlug));
  }, [activeTabSlug, dispatch]);

  // Когда выбран таб 2-го уровня — загружаем продукты для этой вложенной категории
  // Если выбран "ВСЕ", загружаем продукты из активного таба первого уровня
  useEffect(() => {
    if (!activeTabSlug) return;
    
    // Если activeSubTabSlug === "ALL" или null, или subTabs пуст, загружаем все продукты из activeTabSlug
    const slugToLoad = activeSubTabSlug === 'ALL' || !activeSubTabSlug || subTabs.length === 0
      ? activeTabSlug 
      : activeSubTabSlug;

    dispatch(
      getCategoryProducts({
        slug: slugToLoad,
        first: PAGE_SIZE,
        after: null,
        append: false
      })
    );
  }, [activeSubTabSlug, activeTabSlug, subTabs.length, dispatch]);

  const settings = {
    dots: false,
    arrows: true,
    infinite: false,
    speed: 500,
    slidesToShow: 3.5,
    slidesToScroll: 1
  };


  const canLoadMore = useMemo(() => {
    return !!activeTabSlug && !!pageInfo?.hasNextPage && !loading;
  }, [activeTabSlug, pageInfo?.hasNextPage, loading]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry?.isIntersecting) return;

        if (!canLoadMore) return;

        if (activeTabSlug) {
          // Если выбран "ВСЕ", загружаем из activeTabSlug, иначе из activeSubTabSlug
          const slugToLoad = activeSubTabSlug === 'ALL' || !activeSubTabSlug 
            ? activeTabSlug 
            : activeSubTabSlug;
          
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
  }, [dispatch, canLoadMore, activeTabSlug, pageInfo?.endCursor]);


  const handleTopTabChange = (name: string) => {
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
  return (
    <>
      <p className={styles.title}>{items.find(item => item.category.slug === slug)?.name}</p>
      {/* 1-й уровень табов */}
      <TabBar
        tabs={tabs.map(t => t.name)}
        active={tabs.find(t => t.slug === activeTabSlug)?.name}
        onChange={handleTopTabChange}
      />

      {/* 2-й уровень табов (вложенные подкатегории выбранного таба) */}
      {subTabs.length > 0 && (
        <TabBar
          tabs={['ВСЕ', ...subTabs.map(t => t.name)]}
          active={activeSubTabSlug === 'ALL' || !activeSubTabSlug 
            ? 'ВСЕ' 
            : subTabs.find(t => t.slug === activeSubTabSlug)?.name}
          onChange={handleSubTabChange}
        />
      )}

      {!isMobile && (<div>
        <h2 className={styles.subtitle}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>)}

      {products.length > 0 ? (
        <>
          <section className={styles.wrapper}>
            <AnimatePresence mode="sync">
              {products.map((product) => (
                <BestSellerProductCard key={product.id} product={product} loading={loading} />
              ))}
            </AnimatePresence>
          </section>

          {/* sentinel: когда он “виден” — подгружаем */}
          {pageInfo?.hasNextPage && (
            <div ref={loadMoreRef} style={{ height: 1 }} />
          )}

        </>
      ) : (
        <section className={styles.noProductsWrapper}>
          <div className={styles.noProducts}>
            <p>в данной категории пока нет доступных продуктов</p>
          </div>
        </section>
      )}




      {!isMobile && (
        <section className={styles.categoryWrapper}>
          <p className={styles.title}>КАТЕГОРИИ</p>
          <article>
            <Slider {...settings} className={styles.imageSlider}>
              {items.map(product => (
                <article className={styles.imagesWrapper} key={product.id}>
                  <img alt="" src={product.category.backgroundImage.url} className={styles.slideImage}/>
                  <div className={styles.discountWrapper}>
                    <Link to={'/category/' + product.category.slug}>
                      <p className={styles.name}>{product.name}</p>
                    </Link>
                  </div>
                </article>
              ))}
            </Slider>
          </article>
        </section>
      )}
      <Footer footerImage={footerImage}/>
    </>
  );
};

export default LazyComponent;
