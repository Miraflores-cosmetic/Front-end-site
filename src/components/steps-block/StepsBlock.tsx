import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styles from './StepsBlock.module.scss';
import Step from './step/Step';
import { uploadsUrl } from '@/api/apiClient';
import { getCatalogTags } from '@/store/slices/navSlice';
import type { AppDispatch, RootState } from '@/store/store';
import type { StepData } from '@/graphql/queries/pages.service';
import { HomeSection } from '@/components/home-section/HomeSection';

const SKELETON_COUNT = 4;
const STEPS_LIMIT = 4;

function StepsSkeleton() {
  return (
    <div className={styles.carousel} aria-hidden>
      <ul className={`${styles.list} ${styles.skeletonList}`}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <li key={i} className={styles.item}>
            <div className={styles.skeletonCard}>
              <div className={styles.skeletonMedia} />
              <div className={styles.skeletonText}>
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonDesc} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StepsBlock() {
  const dispatch = useDispatch<AppDispatch>();
  const tags = useSelector((s: RootState) => s.nav.tags);
  const tagsLoading = useSelector((s: RootState) => s.nav.tagsLoading);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (tags.length === 0 && !tagsLoading) {
      void dispatch(getCatalogTags());
    }
  }, [dispatch, tags.length, tagsLoading]);

  const steps: StepData[] = useMemo(
    () =>
      tags.slice(0, STEPS_LIMIT).map((tag, idx) => ({
        id: tag.id || idx + 1,
        slug: tag.slug,
        title: tag.title?.trim() || tag.name,
        description: tag.description?.trim() || '',
        image: tag.coverImageUrl
          ? uploadsUrl(tag.coverImageUrl) || tag.coverImageUrl
          : undefined,
      })),
    [tags],
  );

  const loading = tagsLoading && steps.length === 0;

  const syncMobileScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setAtEnd(maxScroll <= 4 || el.scrollLeft >= maxScroll - 8);

    const cards = el.querySelectorAll<HTMLElement>('[data-step-card]');
    if (!cards.length) return;
    const mid = el.scrollLeft + el.clientWidth * 0.35;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const left = card.offsetLeft;
      const dist = Math.abs(left - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setMobileIndex(best);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el || loading) return;
    syncMobileScroll();
    el.addEventListener('scroll', syncMobileScroll, { passive: true });
    window.addEventListener('resize', syncMobileScroll);
    return () => {
      el.removeEventListener('scroll', syncMobileScroll);
      window.removeEventListener('resize', syncMobileScroll);
    };
  }, [loading, steps.length, syncMobileScroll]);

  const scrollToCard = (index: number) => {
    const el = listRef.current;
    if (!el) return;
    const card = el.querySelectorAll<HTMLElement>('[data-step-card]')[index];
    if (!card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  };

  if (!loading && steps.length === 0) return null;

  return (
    <HomeSection id="steps-block" className={styles.section} anchor>
      <header className={styles.header}>
        <h2 className={styles.heading}>каждый шаг усиливает предыдущий</h2>
        <p className={styles.lead}>
          Знали ли вы, что даже самое эффективное средство не сработает, если кожа неправильно
          очищена. Агрессивное умывание всего за минуту может нарушить защитный барьер и сделать
          кожу уязвимой
        </p>
      </header>

      {loading ? (
        <StepsSkeleton />
      ) : (
        <div className={styles.carousel}>
          <ul
            ref={listRef}
            className={styles.list}
            onMouseLeave={() => setActiveIndex(0)}
          >
            {steps.map((step, index) => {
              const isActive = activeIndex === index;
              return (
                <li
                  key={step.id}
                  className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
                  data-step-card
                  onMouseEnter={() => setActiveIndex(index)}
                  onFocus={() => setActiveIndex(index)}
                >
                  <Step
                    etap={index + 1}
                    image={step.image || ''}
                    title={step.title}
                    description={step.description}
                    href={`/catalog/${step.slug}`}
                    isActive={isActive}
                  />
                </li>
              );
            })}
          </ul>

          {!atEnd ? <div className={styles.peek} aria-hidden /> : null}

          <div className={styles.mobileChrome}>
            <div
              className={styles.dots}
              role="tablist"
              aria-label="Этапы ухода"
            >
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileIndex === index}
                  aria-label={`Этап ${index + 1}`}
                  className={
                    mobileIndex === index ? styles.dotActive : styles.dot
                  }
                  onClick={() => scrollToCard(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </HomeSection>
  );
}
