import { useState } from 'react';

interface Props { onStart: (msg: string, secs: number) => void; onClose: () => void }
export default function BreakModal({ onStart, onClose }: Props) {
  const [message, setMessage] = useState('Taking a short break!');
  const [minsRaw, setMinsRaw] = useState('5');
  const minsNum = Number(minsRaw);
  const valid = message.trim() && minsRaw !== '' && minsNum >= 1 && minsNum <= 120;

  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          ☕ Start Break
        </div>
        <div className="flex flex-col gap-1">
          <p className="modal-label">Message shown above games</p>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Break message…"
            className="input-dark"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="modal-label">Duration (minutes)</p>
          <input
            type="number"
            value={minsRaw}
            min={1}
            max={120}
            onChange={(e) => setMinsRaw(e.target.value)}
            className="input-dark"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => valid && onStart(message.trim(), minsNum * 60)}
            disabled={!valid}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-amber"
          >
            Start Break ☕
          </button>
        </div>
      </div>
    </div>
  );
}
