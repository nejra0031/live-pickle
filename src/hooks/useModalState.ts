import { useReducer, useCallback } from 'react';

function modalReducer(state: any, action: any) {
  switch (action.type) {
    case 'OPEN':
      return { open: action.modal, data: action.data ?? null };
    case 'CLOSE':
      return { open: null, data: null };
    default:
      return state;
  }
}

// Replaces 14+ individual boolean/value modal states with a single { open, data } pair.
// open: modal name string | null
// data: modal-specific payload (purpose, targets, indices, etc.)
export function useModalState() {
  const [modal, dispatch] = useReducer(modalReducer, { open: null, data: null });
  const openModal = useCallback(
    (modal: string, data: any = null) => dispatch({ type: 'OPEN', modal, data }),
    []
  );
  const closeModal = useCallback(() => dispatch({ type: 'CLOSE' }), []);
  return { modal, openModal, closeModal };
}
