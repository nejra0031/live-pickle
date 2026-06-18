import { useState, useRef, useEffect, useCallback } from 'react';
import { sha256hex } from '../utils/pin';
import { hasPermission, ROLE_MAP } from '../roleConfig';
import { useRepo } from '../state/RepoProvider';

export function useAccessControl({
  initialRole,
  isOwner,
  repo: _repoProp,
}: { initialRole?: string | null; isOwner?: boolean; repo?: unknown } = {}) {
  const repo = useRepo();

  const [role, setRole] = useState<string | null>(initialRole ?? null);
  const roleRef = useRef<string | null>(null);

  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseErrorPersist, setFirebaseErrorPersist] = useState(false);
  const retrySnapshotRef = useRef(null);

  useEffect(() => {
    if (!firebaseError || firebaseErrorPersist) return;
    const t = setTimeout(() => setFirebaseError(null), 5000);
    return () => clearTimeout(t);
  }, [firebaseError, firebaseErrorPersist]);

  const setCriticalError = useCallback((msg: string, retrySnap: any) => {
    retrySnapshotRef.current = retrySnap || null;
    setFirebaseErrorPersist(true);
    setFirebaseError(msg);
  }, []);

  const dismissError = useCallback(() => {
    setFirebaseError(null);
    setFirebaseErrorPersist(false);
    retrySnapshotRef.current = null;
  }, []);

  const retryWrite = useCallback(() => {
    const snap = retrySnapshotRef.current;
    if (!snap) {
      dismissError();
      return;
    }
    repo.pushSnapshot(snap, (err) => {
      if (err) setCriticalError('Retry failed — check your connection.', snap);
      else dismissError();
    });
  }, [dismissError, setCriticalError, repo]);

  const gatedUpdate = useCallback(
    (perm: string | string[], fields: Record<string, any>) => {
      const perms = Array.isArray(perm) ? perm : [perm];
      if (perms.some((p) => hasPermission(roleRef.current as any, p as any)))
        repo.pushAtomicUpdate(fields, setFirebaseError);
    },
    [repo]
  );

  const handleAddPin = useCallback(
    async (roleId: string, label: string, pinDigits: string) => {
      if (!isOwner) return;
      const r = ROLE_MAP[roleId as keyof typeof ROLE_MAP];
      if (!r) return;
      const hash = await sha256hex(pinDigits);
      return repo.addPin(r.firebasePinsPath, { hash, label });
    },
    [isOwner, repo]
  );

  const handleRevokePin = useCallback(
    (roleId: string, pinId: string) => {
      if (!isOwner) return;
      const r = ROLE_MAP[roleId as keyof typeof ROLE_MAP];
      if (!r) return;
      repo.revokePin(r.firebasePinsPath, pinId);
    },
    [isOwner, repo]
  );

  return {
    role,
    setRole,
    roleRef,
    firebaseError,
    setFirebaseError,
    firebaseErrorPersist,
    retrySnapshotRef,
    setCriticalError,
    dismissError,
    retryWrite,
    gatedUpdate,
    handleAddPin,
    handleRevokePin,
  };
}
