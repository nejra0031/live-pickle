import { createContext, useContext } from 'react';

// Holds all non-reducer state and action handlers that consumer components
// (ModalRoot, PlayTab, MatchesTab) need. Provided by AppInner after all hooks
// have been called. Typed as any for Phase 4 — tightened in Phase 6.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AppCtx = createContext<any>(null);

export function useAppCtx(): any {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useAppCtx must be used within App');
  return ctx;
}

export { AppCtx };
