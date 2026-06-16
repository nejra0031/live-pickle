import { useState } from 'react';
import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';
import NumInput from '../components/NumInput';

export default function AddGameModal({ allTeamIds, defaultCourt, label, courtNumbers = [], usedCourtNumbers = [], usedTeamIds = [], onSave, onClose }) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const usedCourtSet = new Set(usedCourtNumbers.map(String));
  const usedTeamSet = new Set(usedTeamIds);
  const [courtNumber, setCourtNumber] = useState(() => {
    if (defaultCourt && !usedCourtSet.has(String(defaultCourt))) return defaultCourt;
    return courtNumbers.find(c => !usedCourtSet.has(String(c))) || defaultCourt || '';
  });

  const teamA = teamById(teamAId), teamB = teamById(teamBId);
  const scoresValid = scoreA !== '' && scoreB !== '' && Number(scoreA) !== Number(scoreB);
  const teamsValid = teamAId && teamBId && teamAId !== teamBId;
  const courtInUse = String(courtNumber).trim() !== '' && usedCourtSet.has(String(courtNumber).trim());
  const courtValid = String(courtNumber).trim() !== '' && !courtInUse;
  const valid = scoresValid && teamsValid && courtValid;
  const aWins = valid && Number(scoreA) > Number(scoreB);
  const winnerId = valid ? (aWins ? teamAId : teamBId) : null;
  const loserId  = valid ? (aWins ? teamBId : teamAId) : null;
  const winnerScore = valid ? Math.max(Number(scoreA), Number(scoreB)) : null;
  const loserScore  = valid ? Math.min(Number(scoreA), Number(scoreB)) : null;

  const chip = (id, active, onClick) => {
    const t = teamById(id); if (!t) return null;
    const inUse = !active && usedTeamSet.has(id);
    return (
      <button key={id} onClick={inUse ? undefined : onClick} disabled={inUse}
        style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: inUse ? 'not-allowed' : 'pointer', opacity: inUse ? 0.35 : 1, background: active ? t.color + 'bb' : 'rgba(255,255,255,0.05)', color: active ? t.text : '#64748b', border: `2px solid ${active ? t.color : 'rgba(255,255,255,0.1)'}` }}>
        {teamLabel(id)}
      </button>
    );
  };

  const save = () => {
    if (!valid) return;
    onSave({ winnerId, loserId, winnerScore, loserScore, courtNumber: String(courtNumber).trim() });
  };

  const allCourtsUsed = courtNumbers.length > 0 && courtNumbers.every(c => usedCourtSet.has(String(c)));

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">➕ Add Game{label ? ` — ${label}` : ''}</div>

        {allCourtsUsed && <div className="notice-amber">⚠️ All courts are in use — this game won't have a court assigned.</div>}

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Team A</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamAId === id, () => { setTeamAId(id); if (teamBId === id) setTeamBId(teamAId); }))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: teamA ? `${teamA.color}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${teamA ? teamA.color : 'rgba(255,255,255,0.1)'}` }}>
              {teamA && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamA.color }} />}
              <span className="font-bold text-sm flex-1">{teamAId ? teamLabel(teamAId) : '—'}</span>
            </div>
            <NumInput value={scoreA} onChange={setScoreA} />
          </div>
        </div>

        <div className="text-center text-slate-600 text-xs font-bold">VS</div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Team B</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chip(id, teamBId === id, () => { setTeamBId(id); if (teamAId === id) setTeamAId(teamBId); }))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: teamB ? `${teamB.color}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${teamB ? teamB.color : 'rgba(255,255,255,0.1)'}` }}>
              {teamB && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamB.color }} />}
              <span className="font-bold text-sm flex-1">{teamBId ? teamLabel(teamBId) : '—'}</span>
            </div>
            <NumInput value={scoreB} onChange={setScoreB} />
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
          {courtNumbers.length > 0 ? (
            <select value={courtNumber} onChange={e => setCourtNumber(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', outline: 'none' }}>
              <option value="">Select court…</option>
              {courtNumbers.map(c => { const inUse = usedCourtSet.has(String(c)); return (<option key={c} value={c} disabled={inUse}>{c}{inUse ? ' (in use)' : ''}</option>); })}
            </select>
          ) : (
            <input value={courtNumber} onChange={e => setCourtNumber(e.target.value)} placeholder="Court name or number"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: '#e2e8f0', outline: 'none' }} />
          )}
          {courtInUse && <p className="text-xs text-amber-400 mt-1">Court {courtNumber} is already in use — pick another.</p>}
        </div>

        {valid && winnerId && <p className="text-xs text-green-400 text-center">→ {teamLabel(winnerId)} wins {winnerScore}–{loserScore}</p>}
        {!scoresValid && scoreA !== '' && scoreB !== '' && <p className="text-xs text-amber-400 text-center">Scores can't be equal.</p>}
        {!teamsValid && teamAId && teamBId && <p className="text-xs text-amber-400 text-center">Teams must be different.</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Add</button>
        </div>
      </div>
    </div>
  );
}
