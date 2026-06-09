import { useState } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';

export default function PresetMatchModal({ allTeamIds, courtNumbers, usedTeamIds, usedCourtNumbers = [], onSave, onClose }) {
  const teamById = useTeamById();
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const usedSet = new Set(usedTeamIds);
  const usedCourtSet = new Set(usedCourtNumbers.map(String));
  const [courtNumber, setCourtNumber] = useState(() => courtNumbers.find(c => !usedCourtSet.has(String(c))) || courtNumbers[0] || '');

  const courtInUse = courtNumber && usedCourtSet.has(String(courtNumber));
  const valid = teamAId && teamBId && teamAId !== teamBId && courtNumber && !courtInUse;

  const allCourtsUsed = courtNumbers.length > 0 && courtNumbers.every(c => usedCourtSet.has(String(c)));

  const chip = (id, active, onClick) => {
    const t = teamById(id); if (!t) return null;
    const disabled = !active && usedSet.has(id);
    return (
      <button key={id} onClick={disabled ? undefined : onClick} disabled={disabled}
        style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, background: active ? t.color + 'bb' : 'rgba(255,255,255,0.05)', color: active ? t.text : '#64748b', border: `2px solid ${active ? t.color : 'rgba(255,255,255,0.1)'}` }}>
        {t.name}
      </button>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">📌 Pre-set Matchup</div>
        <p className="text-xs text-slate-500">Lock in a game for the next round. Remaining courts are filled by the algorithm.</p>

        {allCourtsUsed && <div className="notice-amber">⚠️ All courts are in use — this preset won't have a free court.</div>}

        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamAId === id, () => { setTeamAId(id); if (teamBId === id) setTeamBId(''); }))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamBId === id, () => { setTeamBId(id); if (teamAId === id) setTeamAId(''); }))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
          <select value={courtNumber} onChange={e => setCourtNumber(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', outline: 'none' }}>
            <option value="">Select court…</option>
            {courtNumbers.map(c => { const inUse = usedCourtSet.has(String(c)); return (<option key={c} value={c} disabled={inUse}>{c}{inUse ? ' (in use)' : ''}</option>); })}
          </select>
        </div>
        {courtInUse && <p className="text-xs text-amber-400 text-center">Court {courtNumber} is already in use — pick another.</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={() => valid && onSave({ teamId1: teamAId, teamId2: teamBId, courtNumber })} disabled={!valid}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">
            Lock In →
          </button>
        </div>
      </div>
    </div>
  );
}
