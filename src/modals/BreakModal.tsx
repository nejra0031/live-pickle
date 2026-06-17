import { useState } from 'react';

export default function BreakModal({ onStart, onClose }) {
  const [message, setMessage] = useState('Taking a short break!');
  const [minsRaw, setMinsRaw] = useState('5');
  const minsNum = Number(minsRaw);
  const valid = message.trim() && minsRaw !== '' && minsNum >= 1 && minsNum <= 120;

  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4"
        style={{ background: '#1e293b', border: '1px solid rgba(251,191,36,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
          ☕ Start Break
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">
            Message (shown above games)
          </p>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Break message…"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 14,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">
            Duration (minutes)
          </p>
          <input
            type="number"
            value={minsRaw}
            min={1}
            max={120}
            onChange={(e) => setMinsRaw(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 14,
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={() => valid && onStart(message.trim(), minsNum * 60)}
            disabled={!valid}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-amber"
          >
            Start Break ☕
          </button>
        </div>
      </div>
    </div>
  );
}
