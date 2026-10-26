import React, { useEffect, useRef, useState } from 'react';

type HomeNearViewportProps = {
  children: React.ReactNode;
  /** Reserve space before mount to limit CLS. */
  minHeight?: number;
  rootMargin?: string;
  className?: string;
};

/**
 * Mount children (and lazy chunks) when the slot nears the viewport.
 */
export function HomeNearViewport({
  children,
  minHeight = 1,
  rootMargin = '480px 0px',
  className,
}: HomeNearViewportProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = slotRef.current;
    if (!el) return;

    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((e) => e.isIntersecting)) {
                setVisible(true);
                io?.disconnect();
              }
            },
            { rootMargin, threshold: 0 },
          )
        : null;

    if (!io) {
      setVisible(true);
      return;
    }

    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div
      ref={slotRef}
      className={className}
      style={visible ? undefined : { minHeight }}
      aria-hidden={!visible ? true : undefined}
    >
      {visible ? children : null}
    </div>
  );
}
