import { useRef, useCallback } from 'react';

export default function useDebounce(fn, delay) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args) => {
      clearTimeout(t.current ?? undefined);
      t.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}
