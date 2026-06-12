import { useState } from 'react';

// Lets an admin/referee record that a different player actually played one of
// the 4 roster slots in a TPT game (e.g. two players swapped courts mid-round).
// Team-level results and rosters are untouched — only player/partnership credit
// is remapped via the returned subsMap.
export default function EditTPTSubsModal({ gameLabel, teamA, teamB, gameDef, tptPlayers, currentSubs = {}, onSave, onClose }) {
  const pName = id => { const p = tptPlayers[id]; return p ? (p.nickname || p.name) : '?'; };

  const [subs, setSubs] = useState(() => ({ ...currentSubs }));

  const sortedPlayers = Object.entries(tptPlayers)
    .map(([id, p]) => ({ id, label: p.nickname || p.name }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const row = (pid) => (
    <div key={pid} className="flex items-center gap-3">
      <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
        <span className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{pName(pid)}</span>
      </div>
      <select value={subs[pid] || ''} onChange={e => setSubs(s => ({ ...s, [pid]: e.target.value }))}
        style={{ flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', outline: 'none' }}>
        <option value="">No substitution</option>
        {sortedPlayers.filter(p => p.id !== pid).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
    </div>
  );

  const save = () => {
    const subsMap = {};
    Object.entries(subs).forEach(([pid, subPid]) => {
      if (subPid && subPid !== pid) subsMap[pid] = subPid;
    });
    onSave(subsMap);
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{gameLabel} — Substitutes</div>
        <p className="text-xs text-slate-500">If a different player actually played a slot, pick them below. Team results are unaffected — only player and partnership stats update.</p>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{teamA.name}</p>
          {(gameDef?.sideA || []).filter(Boolean).map(row)}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{teamB.name}</p>
          {(gameDef?.sideB || []).filter(Boolean).map(row)}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
