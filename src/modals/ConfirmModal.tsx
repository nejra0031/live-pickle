export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}) {
  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-bold text-red-400 uppercase tracking-widest">{title}</div>
        <p className="text-sm text-slate-300">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{
              background: 'linear-gradient(90deg,#dc2626,#ef4444)',
              color: '#fff',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
