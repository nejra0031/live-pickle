import { useState } from 'react';

interface Props { currentMins: number; onSave: (mins: number) => void; onClose: () => void }
export default function TimerSettingsModal({ currentMins, onSave, onClose }: Props) {
  const [mins, setMins] = useState(currentMins);
  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-5 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ⚙️ Timer Settings
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={99}
            value={mins}
            onChange={(e) => setMins(Math.max(1, Number(e.target.value)))}
            className="input-dark"
            style={{ width: 70, textAlign: 'center', fontSize: 20, fontWeight: 700 }}
          />
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>minutes per round</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Applies after next ↺ reset.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => { onSave(mins); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-indigo"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
