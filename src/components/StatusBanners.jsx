// Fixed-position overlays: the multi-admin warning (top) and the Firebase error
// toast (bottom, with optional Retry for critical/persistent errors).
export default function StatusBanners({
  isAdmin, multiAdminCount, multiAdminDismissed, onDismissMultiAdmin,
  firebaseError, firebaseErrorPersist, canRetry, onRetry, onDismissError,
}) {
  return (
    <>
      {isAdmin && !multiAdminDismissed && multiAdminCount > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99, padding: '6px 16px', background: '#d97706', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span>⚠️ {multiAdminCount} other admin session{multiAdminCount > 1 ? 's' : ''} active — results from multiple admins are now handled safely.</span>
          <button onClick={onDismissMultiAdmin} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
        </div>
      )}
      {firebaseError && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 16px rgba(0,0,0,0.3)', maxWidth: 'calc(100vw - 32px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>⚠️ {firebaseError}</span>
            {firebaseErrorPersist && canRetry && <button onClick={onRetry} style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Retry</button>}
            <button onClick={onDismissError} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          {firebaseErrorPersist && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Do not refresh — tournament data is held in memory and will sync when connection is restored.</span>}
        </div>
      )}
    </>
  );
}
