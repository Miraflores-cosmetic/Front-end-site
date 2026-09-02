import React, { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import styles from './ProductScrollStrip.module.scss';

export type ProductScrollStripSize = 'lg' | 'md' | 'sm';

const SIZE_PRESETS: Record<
  ProductScrollStripSize,
  { itemWidth: number; itemWidthMobile: number }
> = {
  lg: { itemWidth: 432, itemWidthMobile: 264 },
  md: { itemWidth: 340, itemWidthMobile: 220 },
  sm: { itemWidth: 280, itemWidthMobile: 200 },
};

export type ProductScrollStripProps = {
  children: React.ReactNode;
  'aria-label'?: string;
  className?: string;
  /** Preset card widths (overrides itemWidth*). Default lg. */
  size?: ProductScrollStripSize;
  itemWidth?: number;
  itemWidthMobile?: number;
  /** Desktop gap between cards. Default 24. */
  gap?: number;
  /** Mobile gap. Default 12. */
  gapMobile?: number;
  /**
   * Max width of the page column for right-edge bleed.
   * Defaults to CSS `var(--page-max-width, 100vw)` — set `--page-max-width` on a parent
   * (e.g. Home) or pass explicitly (e.g. `1536px`). Use `100vw` to disable center bleed.
   */
  pageMaxWidth?: string;
  /** Extra desktop bleed past parent right padding (e.g. 32). Default 0. */
  bleed?: number;
  /** Extra mobile bleed past page side padding. Default 16. */
  bleedMobile?: number;
  /**
   * Explicit LTR start inset for the first card (and scroll-padding).
   * Keep in sync with the section title — don’t rely only on parent padding.
   * Default 0.
   */
  padInlineStart?: number;
  padInlineStartMobile?: number;
  /** Right fade hint that more cards exist. Default true. */
  peek?: boolean;
  /** scroll-snap-type: x mandatory. Default true. */
  snap?: boolean;
};

function normalizeWheelDelta(e: WheelEvent, fallbackLine = 16): { x: number; y: number } {
  let x = e.deltaX;
  let y = e.deltaY;
  if (e.deltaMode === 1) {
    x *= fallbackLine;
    y *= fallbackLine;
  } else if (e.deltaMode === 2) {
    x *= window.innerWidth;
    y *= window.innerHeight;
  }
  return { x, y };
}

/**
 * Горизонтальная лента карточек: snap, peek-градиент, bleed до края viewport.
 */
export function ProductScrollStrip({
  children,
  'aria-label': ariaLabel = 'Список товаров',
  className,
  size = 'lg',
  itemWidth,
  itemWidthMobile,
  gap = 24,
  gapMobile = 12,
  pageMaxWidth,
  bleed = 0,
  bleedMobile = 16,
  padInlineStart = 0,
  padInlineStartMobile = 0,
  peek = true,
  snap = true,
}: ProductScrollStripProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  const preset = SIZE_PRESETS[size];
  const w = itemWidth ?? preset.itemWidth;
  const wMobile = itemWidthMobile ?? preset.itemWidthMobile;

  const cssVars = useMemo(() => {
    const vars: CSSProperties & Record<string, string> = {
      '--strip-item-w': `${w}px`,
      '--strip-item-w-mobile': `${wMobile}px`,
      '--strip-gap': `${gap}px`,
      '--strip-gap-mobile': `${gapMobile}px`,
      '--strip-bleed': `${bleed}px`,
      '--strip-bleed-mobile': `${bleedMobile}px`,
      '--strip-pad-start': `${padInlineStart}px`,
      '--strip-pad-start-mobile': `${padInlineStartMobile}px`,
    };
    if (pageMaxWidth) {
      vars['--strip-page-max'] = pageMaxWidth;
    }
    return vars;
  }, [
    w,
    wMobile,
    gap,
    gapMobile,
    bleed,
    bleedMobile,
    padInlineStart,
    padInlineStartMobile,
    pageMaxWidth,
  ]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const el = stripRef.current;
    if (!wrap || !el) return;

    let snapRestoreTimer = 0;
    /** Пока жест горизонтальный — блокируем вертикальный page-scroll (тачпад шлёт оба delta). */
    let axisLock: 'x' | 'y' | null = null;
    let axisLockUntil = 0;
    let pendingDelta = 0;
    let rafId = 0;

    const pauseSnap = () => {
      el.classList.add(styles.snapOff);
      window.clearTimeout(snapRestoreTimer);
      snapRestoreTimer = window.setTimeout(() => {
        el.classList.remove(styles.snapOff);
      }, 280);
    };

    const flushScroll = () => {
      rafId = 0;
      if (pendingDelta === 0) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const next = Math.max(0, Math.min(maxScroll, el.scrollLeft + pendingDelta));
      pendingDelta = 0;
      if (next !== el.scrollLeft) {
        el.scrollLeft = next;
      }
    };

    /**
     * Горизонтальный жест тачпада (deltaX) / Shift+колёсико.
     * Axis-lock: после выбора оси X поглощаем и Y, чтобы страница не дёргалась.
     * Capture: иначе horizontal wheel иногда «съедает» page latching.
     */
    const onWheel = (e: WheelEvent) => {
      const target = e.target;
      if (!(target instanceof Node) || !wrap.contains(target)) return;

      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 1) return;

      const { x, y } = normalizeWheelDelta(e);
      const now = performance.now();
      if (now > axisLockUntil) axisLock = null;

      const shiftVertical = e.shiftKey && y !== 0 && x === 0;
      const absX = Math.abs(x);
      const absY = Math.abs(y);

      if (!axisLock && (absX > 0.5 || absY > 0.5 || shiftVertical)) {
        if (shiftVertical || (absX > 0.5 && absX >= absY * 0.55)) {
          axisLock = 'x';
        } else {
          axisLock = 'y';
        }
      }

      if (axisLock === 'x' || shiftVertical) {
        axisLockUntil = now + 180;
        const delta = shiftVertical ? y : x;
        // Блокируем и «косой» deltaY, иначе страница едет вместе с лентой
        e.preventDefault();
        if (delta !== 0) {
          pauseSnap();
          pendingDelta += delta;
          if (!rafId) rafId = window.requestAnimationFrame(flushScroll);
        }
        return;
      }

      axisLockUntil = now + 120;
    };

    /**
     * Touch/pen: native overflow-x часто не срабатывает из‑за <Link>/кнопок внутри.
     * Горизонтальный pan ведём сами; вертикаль оставляем странице.
     */
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startScroll = 0;
    let axis: 'x' | 'y' | null = null;
    let dragged = false;

    const onPointerDown = (e: PointerEvent) => {
      // Touch/pen: native overflow-x + touch-action: pan-x pan-y
      if (e.pointerType !== 'mouse') return;
      if (e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      startScroll = el.scrollLeft;
      axis = null;
      dragged = false;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'x') {
          try {
            el.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
      }

      if (axis !== 'x') return;
      dragged = true;
      pauseSnap();
      el.scrollLeft = startScroll - dx;
      e.preventDefault();
    };

    const endPointer = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      if (dragged) {
        const suppressClick = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        el.addEventListener('click', suppressClick, true);
        window.setTimeout(() => {
          el.removeEventListener('click', suppressClick, true);
        }, 0);
      }
      pointerId = null;
      axis = null;
      dragged = false;
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);

    return () => {
      window.clearTimeout(snapRestoreTimer);
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', onWheel, true);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', endPointer);
      el.removeEventListener('pointercancel', endPointer);
      el.classList.remove(styles.snapOff);
    };
  }, []);

  useEffect(() => {
    if (!peek) return;
    const el = stripRef.current;
    if (!el) return;

    const update = () => {
      const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setAtEnd(remaining <= 2);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [peek]);

  return (
    <div
      ref={wrapRef}
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      style={cssVars}
    >
      <div
        ref={stripRef}
        className={[styles.strip, snap ? styles.snap : ''].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
      >
        <div className={styles.track}>{children}</div>
      </div>
      {peek && !atEnd ? <div className={styles.peek} aria-hidden /> : null}
    </div>
  );
}

export function ProductScrollStripItem({ children }: { children: React.ReactNode }) {
  return <div className={styles.item}>{children}</div>;
}
