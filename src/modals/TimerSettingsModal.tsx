import { useState } from 'react';

interface Props { currentMins: number; onSave: (mins: number) => void; onClose: () => void }
export default function TimerSettingsModal({ currentMins, onSave, onClose }: Props) {
  const [mins, setMins] = useState(currentMins);
  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">
          ⚙️ Timer Settings
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={99}
            value={mins}
            onChange={(e) => setMins(Math.max(1, Number(e.target.value)))}
            style={{
              width: 70,
              textAlign: 'center',
              padding: '8px',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#e2e8f0',
              outline: 'none',
            }}
          />
          <span className="text-slate-400 text-sm">minutes per round</span>
        </div>
        <p className="text-slate-500 text-xs">Applies after next ↺ reset.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(mins);
              onClose();
            }}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
