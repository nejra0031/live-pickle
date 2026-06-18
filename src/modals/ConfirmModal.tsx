interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}
export default function ConfirmModal({ title, message, confirmLabel = 'Confirm', onConfirm, onClose }: Props) {
  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--red)', color: '#fff', cursor: 'pointer', border: 'none' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
