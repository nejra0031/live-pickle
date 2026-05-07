import { useRef, useCallback } from 'react';

export default function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]); // eslint-disable-line react-hooks/exhaustive-deps
}
