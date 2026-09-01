import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchCatalog } from '@/api/cmsApi';
import { uploadsUrl } from '@/api/apiClient';
import { closeDrawer } from '@/store/slices/drawerSlice';
import { isHiddenInNav } from '@/utils/navHide';
import type { RootState } from '@/store/store';
import styles from './SearchDrawer.module.scss';

type SearchHit = {
  id: string;
  title: string;
  href: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

type SearchGroup = {
  key: string;
  label: string;
  items: SearchHit[];
};

type FlatHit = SearchHit & { groupKey: string };

const DEBOUNCE_MS = 220;
const MIN_CHARS = 2;
const CLOSE_MS = 560;
const RECENT_KEY = 'mira.search.recent';
const RECENT_MAX = 6;
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const HINTS = [
  { label: 'Крем', q: 'крем' },
  { label: 'Сыворотка', q: 'сыворотка' },
  { label: 'Очищение', q: 'очищение' },
  { label: 'Тоник', q: 'тоник' },
];

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function closeDelayMs(): number {
  return prefersReducedMotion() ? 0 : CLOSE_MS;
}

function ClearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M15 5L5 15M5 5l10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M15 5L5 15M5 5l10 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HitGlyph({ type }: { type: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true as const,
  };
  const stroke = {
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (type) {
    case 'product':
      return (
        <svg {...common}>
          <path
            d="M8 7h8c2.8 0 3.1 1.3 3.3 2.9l.8 6.2c.2 2-.4 3.7-3.3 3.7H7.2c-2.9 0-3.5-1.7-3.3-3.7l.8-6.2C5 8.3 5.3 7 8 7Z"
            {...stroke}
          />
          <path d="M8 8.2V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5v2.7" {...stroke} />
        </svg>
      );
    case 'blog':
    case 'article':
      return (
        <svg {...common}>
          <path d="M6 4h9l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" {...stroke} />
          <path d="M15 4v3h3M8 11h8M8 15h6" {...stroke} />
        </svg>
      );
    case 'category':
      return (
        <svg {...common}>
          <path
            d="M3 7.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2h-7l-1.5-2H5a2 2 0 0 0-2 2Z"
            {...stroke}
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" {...stroke} />
        </svg>
      );
  }
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(query: string) {
  const q = query.trim();
  if (q.length < MIN_CHARS) return;
  const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
    0,
    RECENT_MAX
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function titleRank(title: string, query: string): number {
  const t = title.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 3;
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return 3;
}

function usefulSubtitle(hit: SearchHit): string | null {
  const sub = hit.subtitle?.trim();
  if (!sub) return null;
  if (sub.toLowerCase() === hit.title.trim().toLowerCase()) return null;
  if (sub.length > 72) return null;
  return sub;
}

function rankGroupItems(items: SearchHit[], query: string): SearchHit[] {
  return [...items].sort((a, b) => {
    const d = titleRank(a.title, query) - titleRank(b.title, query);
    if (d !== 0) return d;
    return a.title.localeCompare(b.title, 'ru');
  });
}

function normalizeGroups(
  groups: Array<{
    key: string;
    label: string;
    items: Array<{
      id: string;
      title: string;
      href: string;
      subtitle?: string | null;
      imageUrl?: string | null;
    }>;
  }>,
  query: string
): SearchGroup[] {
  return groups
    .map((g) => ({
      key: g.key,
      label: g.label,
      items: rankGroupItems(
        g.items.map((hit) => ({
          ...hit,
          imageUrl: uploadsUrl(hit.imageUrl) || hit.imageUrl || null,
        })),
        query
      ),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => {
      const best = (g: SearchGroup) =>
        g.items.length ? titleRank(g.items[0]!.title, query) : 99;
      return best(a) - best(b);
    });
}

function highlightTitle(title: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return title;
  const lower = title.toLowerCase();
  const qi = lower.indexOf(q.toLowerCase());
  if (qi < 0) return title;
  return (
    <>
      {title.slice(0, qi)}
      <mark className={styles.mark}>{title.slice(qi, qi + q.length)}</mark>
      {title.slice(qi + q.length)}
    </>
  );
}

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && !el.hasAttribute('disabled')
  );
}

const SearchDrawer: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isOpen = useSelector((s: RootState) => s.drawer.activeDrawer === 'search');
  const navItems = useSelector((s: RootState) => s.nav.items);

  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [openAnim, setOpenAnim] = useState(false);
  const [closing, setClosing] = useState(false);
  const [compact, setCompact] = useState(false);
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retryTick, setRetryTick] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const flatHits = useMemo<FlatHit[]>(
    () =>
      groups.flatMap((g) =>
        g.items.map((item) => ({
          ...item,
          groupKey: g.key,
        }))
      ),
    [groups]
  );

  const popularCategories = useMemo(
    () =>
      navItems
        .filter((item) => !isHiddenInNav(item))
        .slice(0, 6)
        .map((item) => ({
          label: item.name,
          href: `/catalog/${item.category.slug}`,
        })),
    [navItems]
  );

  const finishClose = useCallback(() => {
    dispatch(closeDrawer());
    setVisible(false);
    setOpenAnim(false);
    setClosing(false);
    setQ('');
    setGroups([]);
    setSearched(false);
    setLoadError(false);
    setBusy(false);
    setActiveIndex(-1);
    const el = returnFocusRef.current;
    returnFocusRef.current = null;
    window.setTimeout(() => {
      if (el && typeof el.focus === 'function' && document.contains(el)) {
        el.focus();
        return;
      }
      const fallback =
        document.querySelector<HTMLElement>('[data-search-trigger]') ||
        document.querySelector<HTMLElement>('[data-menu-trigger]');
      fallback?.focus();
    }, 0);
  }, [dispatch]);

  const resetQuery = useCallback(() => {
    abortRef.current?.abort();
    setQ('');
    setGroups([]);
    setSearched(false);
    setLoadError(false);
    setBusy(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const requestClose = useCallback(() => {
    if (closing) return;
    const delay = closeDelayMs();
    if (delay === 0) {
      finishClose();
      return;
    }
    setClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(finishClose, delay);
  }, [closing, finishClose]);

  const applyQuery = useCallback((next: string) => {
    setQ(next);
    setActiveIndex(-1);
    inputRef.current?.focus();
  }, []);

  const goToHit = useCallback(
    (href: string, queryForRecent?: string) => {
      if (queryForRecent) pushRecent(queryForRecent);
      requestClose();
      navigate(href);
    },
    [navigate, requestClose]
  );

  useEffect(() => {
    if (!isOpen) {
      if (!closing) {
        setVisible(false);
        setOpenAnim(false);
        setQ('');
        setGroups([]);
        setSearched(false);
        setLoadError(false);
        setBusy(false);
        setActiveIndex(-1);
      }
      return;
    }

    // Не сбрасывать closing: иначе крестик / Esc «открывают» панель снова
    if (closing) return;

    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const active = document.activeElement;
    if (active instanceof HTMLElement) returnFocusRef.current = active;
    setRecent(readRecent());
    setVisible(true);
    setOpenAnim(false);
    let cancelled = false;
    let raf = 0;
    if (prefersReducedMotion()) {
      setOpenAnim(true);
    } else {
      raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) setOpenAnim(true);
        });
      });
    }
    const t = window.setTimeout(
      () => inputRef.current?.focus(),
      prefersReducedMotion() ? 0 : 80
    );
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [isOpen, closing]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add('drawer-open');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.classList.remove('drawer-open');
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const syncViewport = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      rootRef.current?.style.setProperty('--search-vvh', `${Math.round(h)}px`);
      setCompact(h < 560);
    };
    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    return () => {
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
    };
  }, [isOpen, visible]);

  useEffect(() => {
    if (!isOpen || closing) return;
    const trimmed = q.trim();
    if (trimmed.length < MIN_CHARS) {
      abortRef.current?.abort();
      setGroups([]);
      setSearched(false);
      setLoadError(false);
      setBusy(false);
      setActiveIndex(-1);
      return;
    }

    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBusy(true);
      setLoadError(false);
      void (async () => {
        try {
          const res = await searchCatalog(trimmed, { signal: ac.signal });
          if (ac.signal.aborted) return;
          setGroups(normalizeGroups(res.groups ?? [], trimmed));
          setSearched(true);
          setLoadError(false);
          setActiveIndex(-1);
        } catch (err) {
          if (ac.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
            return;
          }
          setGroups([]);
          setSearched(false);
          setLoadError(true);
          setActiveIndex(-1);
        } finally {
          if (!ac.signal.aborted) setBusy(false);
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [q, isOpen, closing, retryTick]);

  useEffect(() => {
    if (!isOpen || closing) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (q.trim()) {
          resetQuery();
          return;
        }
        requestClose();
        return;
      }

      if (e.key === 'Tab') {
        const root = rootRef.current;
        if (!root) return;
        const nodes = focusablesIn(root);
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        const first = nodes[0]!;
        const last = nodes[nodes.length - 1]!;
        if (e.shiftKey) {
          if (document.activeElement === first || !root.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !root.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (flatHits.length === 0) return;
        e.preventDefault();
        setActiveIndex((prev) => {
          if (e.key === 'ArrowDown') {
            return prev < 0 ? 0 : (prev + 1) % flatHits.length;
          }
          return prev <= 0 ? flatHits.length - 1 : prev - 1;
        });
        return;
      }

      if (e.key === 'Enter') {
        const trimmed = q.trim();
        // Только при явном выборе стрелками — иначе «смотреть все» / catalog
        if (activeIndex >= 0 && flatHits[activeIndex]) {
          e.preventDefault();
          goToHit(flatHits[activeIndex]!.href, trimmed);
          return;
        }
        if (trimmed.length >= MIN_CHARS) {
          e.preventDefault();
          pushRecent(trimmed);
          goToHit(`/catalog?q=${encodeURIComponent(trimmed)}`, trimmed);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isOpen,
    closing,
    flatHits,
    activeIndex,
    q,
    resetQuery,
    requestClose,
    goToHit,
  ]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-search-hit-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      abortRef.current?.abort();
    },
    []
  );

  if (!visible && !isOpen) return null;

  const trimmed = q.trim();
  const hint = trimmed.length > 0 && trimmed.length < MIN_CHARS ? 'Введите минимум 2 символа' : null;
  const showIdle = trimmed.length < MIN_CHARS && !busy;
  const showEmpty = searched && !busy && !loadError && flatHits.length === 0;
  const showError = loadError && !busy;
  const showResults = !busy && flatHits.length > 0;
  const catalogAllHref = `/catalog?q=${encodeURIComponent(trimmed)}`;
  const listboxExpanded = !closing && (showIdle || showResults || showEmpty || showError || busy || !!hint);

  let hitOffset = 0;

  return (
    <div
      ref={rootRef}
      className={[
        styles.root,
        openAnim && !closing ? styles.open : '',
        closing ? styles.closing : '',
        compact ? styles.compact : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Поиск по сайту"
    >
      <button
        type="button"
        className={styles.scrim}
        aria-label="Закрыть поиск"
        tabIndex={-1}
        onClick={requestClose}
      />

      <div className={styles.slide}>
        <div className={styles.bg} aria-hidden />
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Закрыть поиск"
          tabIndex={-1}
          onClick={requestClose}
        />
        <div className={styles.panel}>
          <div className={styles.inner}>
            <div className={styles.topBar}>
              <p className={styles.topLabel}>Поиск</p>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть поиск"
                onClick={requestClose}
              >
                <CloseIcon />
              </button>
            </div>

            <div className={styles.fieldRow}>
              <label className={styles.srOnly} htmlFor={inputId}>
                Поиск по сайту
              </label>
              <div className={styles.inputWrap}>
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  role="combobox"
                  inputMode="search"
                  enterKeyHint="search"
                  className={styles.input}
                  placeholder="Название товара или категории"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setActiveIndex(-1);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  aria-autocomplete="list"
                  aria-expanded={listboxExpanded}
                  aria-haspopup="listbox"
                  aria-controls={listboxId}
                  aria-activedescendant={
                    activeIndex >= 0 ? `mira-search-hit-${activeIndex}` : undefined
                  }
                />
                {q.length > 0 ? (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    aria-label="Очистить запрос"
                    onClick={resetQuery}
                  >
                    <ClearIcon />
                  </button>
                ) : null}
              </div>
            </div>

            <div
              id={listboxId}
              ref={listRef}
              className={styles.results}
              role="listbox"
              aria-label="Подсказки и результаты поиска"
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <p className={styles.srOnly} aria-live="polite">
                    Идёт поиск
                  </p>
                  <div className={styles.skeleton} aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={styles.skeletonRow}>
                        <span className={styles.skeletonThumb} />
                        <span className={styles.skeletonLines}>
                          <span className={styles.skeletonLine} />
                          <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {hint && !busy ? <p className={styles.meta}>{hint}</p> : null}

              {showIdle ? (
                <div className={styles.idle}>
                  {recent.length > 0 ? (
                    <section className={styles.group}>
                      <h2 className={styles.groupLabel}>Недавние</h2>
                      <ul className={styles.chipList}>
                        {recent.map((item) => (
                          <li key={item}>
                            <button
                              type="button"
                              className={styles.chip}
                              onClick={() => applyQuery(item)}
                            >
                              {item}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <section className={styles.group}>
                    <h2 className={styles.groupLabel}>Популярные запросы</h2>
                    <ul className={styles.chipList}>
                      {HINTS.map((item) => (
                        <li key={item.q}>
                          <button
                            type="button"
                            className={styles.chip}
                            onClick={() => applyQuery(item.q)}
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {popularCategories.length > 0 ? (
                    <section className={styles.group}>
                      <h2 className={styles.groupLabel}>Категории</h2>
                      <ul className={styles.chipList}>
                        {popularCategories.map((item) => (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              className={styles.chipLink}
                              onClick={() => requestClose()}
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {showError ? (
                <div className={styles.empty}>
                  <p className={styles.meta}>Не удалось загрузить</p>
                  <div className={styles.emptyActions}>
                    <button
                      type="button"
                      className={styles.emptyBtn}
                      onClick={() => setRetryTick((n) => n + 1)}
                    >
                      Повторить
                    </button>
                  </div>
                </div>
              ) : null}

              {showEmpty ? (
                <div className={styles.empty}>
                  <p className={styles.meta}>Ничего не найдено</p>
                  <div className={styles.emptyActions}>
                    <button type="button" className={styles.emptyBtn} onClick={resetQuery}>
                      Сбросить
                    </button>
                    <Link to="/catalog" className={styles.emptyLink} onClick={requestClose}>
                      В каталог
                    </Link>
                    <Link to="/articles" className={styles.emptyLink} onClick={requestClose}>
                      Статьи
                    </Link>
                  </div>
                </div>
              ) : null}

              {showResults
                ? groups.map((group) => {
                    const offset = hitOffset;
                    hitOffset += group.items.length;
                    return (
                      <section key={group.key} className={styles.group}>
                        <h2 className={styles.groupLabel}>{group.label}</h2>
                        <ul className={styles.hitList} role="presentation">
                          {group.items.map((hit, i) => {
                            const index = offset + i;
                            const active = index === activeIndex;
                            const sub = usefulSubtitle(hit);
                            return (
                              <li key={`${group.key}-${hit.id}`} role="presentation">
                                <Link
                                  id={`mira-search-hit-${index}`}
                                  to={hit.href}
                                  className={`${styles.hit} ${active ? styles.hitActive : ''}`}
                                  role="option"
                                  aria-selected={active}
                                  data-search-hit-index={index}
                                  onMouseEnter={() => setActiveIndex(index)}
                                  onClick={() => {
                                    pushRecent(trimmed);
                                    requestClose();
                                  }}
                                >
                                  {hit.imageUrl ? (
                                    <img src={hit.imageUrl} alt="" className={styles.hitImg} />
                                  ) : (
                                    <span className={styles.hitPh} aria-hidden>
                                      <HitGlyph type={group.key} />
                                    </span>
                                  )}
                                  <span className={styles.hitText}>
                                    <span className={styles.hitTitle}>
                                      {highlightTitle(hit.title, trimmed)}
                                    </span>
                                    {sub ? <span className={styles.hitSub}>{sub}</span> : null}
                                  </span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })
                : null}

              {showResults ? (
                <div className={styles.footer}>
                  <p className={styles.meta}>
                    Показано {flatHits.length}
                    {flatHits.length >= 20 ? '+' : ''}
                  </p>
                  <Link
                    to={catalogAllHref}
                    className={styles.viewAll}
                    onClick={() => {
                      pushRecent(trimmed);
                      requestClose();
                    }}
                  >
                    Смотреть все
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchDrawer;
