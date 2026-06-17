import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useModalState } from '../hooks/useModalState';

interface ModalCtxValue {
  modal: { open: string | null; data: any };
  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
}

const ModalCtx = createContext<ModalCtxValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const value = useModalState();
  return <ModalCtx.Provider value={value}>{children}</ModalCtx.Provider>;
}

export function useModal(): ModalCtxValue {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}
