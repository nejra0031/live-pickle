import { useState } from 'react';
import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';

export default function EditActiveCourtModal({ courtIdx, courtNumbers, currentCourts, allTeamIds, hasPending, onSave, onClose }) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const cur = currentCourts[courtIdx] || [];
  const currentCourtNum = courtNumbers[courtIdx] ?? courtIdx + 1;
  const [teamAId, setTeamAId] = useState(cur[0]?.id || '');
  const [teamBId, setTeamBId] = useState(cur[1]?.id || '');
  const [courtNum, setCourtNum] = useState(String(currentCourtNum));

  const courtNumTrimmed = courtNum.trim();
  const teamsValid = teamAId && teamBId && teamAId !== teamBId && courtNumTrimmed !== '';

  const save = () => {
    if (!teamsValid) return;
    onSave({ courtIdx, teamAId, teamBId, courtNum: courtNumTrimmed });
  };

  const chip = (id, active, onClick) => {
    const t = teamById(id); if (!t) return null;
    return (
      <button key={id} onClick={onClick}
        style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? t.color + 'bb' : 'rgba(255,255,255,0.05)', color: active ? t.text : '#64748b', border: `2px solid ${active ? t.color : 'rgba(255,255,255,0.1)'}` }}>
        {teamLabel(id)}
      </button>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Court {currentCourtNum} — Edit Game</div>
        {hasPending && <div className="notice-amber">⚠️ Entered score will be cleared.</div>}
        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court Name</p>
          <input
            value={courtNum}
            onChange={e => setCourtNum(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: `1px solid ${courtNumTrimmed === '' ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, color: '#e2e8f0', outline: 'none' }}
          />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team A</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamAId === id, () => { setTeamAId(id); if (teamBId === id) setTeamBId(teamAId); }))}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Team B</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamBId === id, () => { setTeamBId(id); if (teamAId === id) setTeamAId(teamBId); }))}
          </div>
        </div>
        {!teamsValid && teamAId === teamBId && <p className="text-xs text-amber-400 text-center">Teams must be different.</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} disabled={!teamsValid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
