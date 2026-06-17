import { useState, useRef, useEffect, useCallback } from 'react';

const TAB_ORDER = ['play', 'standings', 'matches'];

export function useAppChrome({ setActiveTab }) {
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(140);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setHeaderHeight(e.contentRect.height + 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const swipeTouchRef = useRef<{ x: number; y: number } | null>(null);
  const handleSwipeStart = useCallback((e) => {
    const t = e.touches[0];
    swipeTouchRef.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleSwipeEnd = useCallback(
    (e) => {
      if (!swipeTouchRef.current) return;
      const dx = e.changedTouches[0].clientX - swipeTouchRef.current.x;
      const dy = e.changedTouches[0].clientY - swipeTouchRef.current.y;
      swipeTouchRef.current = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      setActiveTab((t) => {
        const i = TAB_ORDER.indexOf(t);
        if (i === -1) return t;
        const ni = i + (dx < 0 ? 1 : -1);
        return TAB_ORDER[Math.max(0, Math.min(TAB_ORDER.length - 1, ni))];
      });
    },
    [setActiveTab]
  );

  return {
    headerHidden,
    setHeaderHidden,
    headerRef,
    headerHeight,
    handleSwipeStart,
    handleSwipeEnd,
  };
}
