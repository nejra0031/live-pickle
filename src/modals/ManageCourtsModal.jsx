import { useState } from 'react';

export default function ManageCourtsModal({ courtNumbers, rrCourtCount = 0, onSave, onClose }) {
  const [local, setLocal] = useState(courtNumbers.map(c => String(c)));

  const rename = (i, v) => setLocal(p => p.map((c, j) => j === i ? v : c));
  const remove = (i) => setLocal(p => p.filter((_, j) => j !== i));
  const addCourt = () => {
    const existing = new Set(local.map(v => v.trim()));
    let n = local.length + 1;
    while (existing.has(String(n))) n++;
    setLocal(p => [...p, String(n)]);
  };

  const valid = local.length >= 1 && local.every(v => v.trim() !== '') && new Set(local.map(v => v.trim())).size === local.length;
  const rrWarning = rrCourtCount > 0 && local.length < rrCourtCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-xs flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">🏟️ Manage Courts</div>
        <p className="text-xs text-slate-500">Rename, add, or remove courts. Changes take effect immediately.</p>
        {rrWarning && (
          <div className="notice-amber">⚠️ Round Robin is active with {rrCourtCount} court{rrCourtCount !== 1 ? 's' : ''} — reducing below that may break the schedule.</div>
        )}
        <div className="flex flex-col gap-2">
          {local.map((c, i) => {
            const duplicate = local.filter((_, j) => j !== i).map(v => v.trim()).includes(c.trim());
            const invalid = c.trim() === '' || duplicate;
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold" style={{ width: 20, textAlign: 'right' }}>{i + 1}.</span>
                <input value={c} onChange={e => rename(i, e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: `1px solid ${invalid ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, color: '#e2e8f0', outline: 'none' }} />
                <button onClick={() => remove(i)} disabled={local.length <= 1}
                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: local.length <= 1 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.15)', color: local.length <= 1 ? '#475569' : '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}>×</button>
              </div>
            );
          })}
        </div>
        <button onClick={addCourt}
          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
          + Add Court
        </button>
        {!valid && <p className="text-xs text-amber-400">Court names must be unique and non-empty.</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={() => valid && onSave(local.map(v => v.trim()))} disabled={!valid}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
