import { useRef, useCallback } from 'react';

export default function useDebounce(fn: (...args: any[]) => any, delay: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: any[]) => {
      clearTimeout(t.current ?? undefined);
      t.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}
