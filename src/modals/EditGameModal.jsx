import { useState } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';
import NumInput from '../components/NumInput';
import { toArr } from '../normalise';

export default function EditGameModal({ game, roundEntry, allTeamIds, label, onSave, onClose }) {
  const teamById = useTeamById();
  const [teamAId, setTeamAId] = useState(game.winnerId);
  const [teamBId, setTeamBId] = useState(game.loserId);
  const [scoreA, setScoreA] = useState(game.winnerScore);
  const [scoreB, setScoreB] = useState(game.loserScore);
  const [courtNum, setCourtNum] = useState(String(game.courtNumber ?? ''));

  const teamA = teamById(teamAId), teamB = teamById(teamBId);
  const scoresValid = scoreA !== '' && scoreB !== '' && Number(scoreA) !== Number(scoreB);
  const teamsValid = teamAId && teamBId && teamAId !== teamBId;
  const courtValid = courtNum.trim() !== '';
  const valid = scoresValid && teamsValid && courtValid;
  const aWins = valid && Number(scoreA) > Number(scoreB);
  const newWinnerId = valid ? (aWins ? teamAId : teamBId) : null;
  const newLoserId  = valid ? (aWins ? teamBId : teamAId) : null;
  const newWinnerScore = valid ? Math.max(Number(scoreA), Number(scoreB)) : null;
  const newLoserScore  = valid ? Math.min(Number(scoreA), Number(scoreB)) : null;
  const teamsChanged = teamAId !== game.winnerId || teamBId !== game.loserId;

  const lockedIds = new Set(
    roundEntry.games.flatMap(g => [g.winnerId, g.loserId])
      .filter(id => id !== game.winnerId && id !== game.loserId)
  );

  const save = () => {
    if (!valid) return;
    const playingAfter = new Set([...lockedIds, teamAId, teamBId]);
    const pausedInRound = new Set(toArr(roundEntry.paused || []));
    const newBye = allTeamIds.filter(id => !playingAfter.has(id) && !pausedInRound.has(id));
    onSave({ game: { winnerId: newWinnerId, loserId: newLoserId, winnerScore: newWinnerScore, loserScore: newLoserScore, courtNumber: courtNum.trim() }, newBye });
  };

  const chipBtn = (id, active, onClick) => {
    const t = teamById(id); if (!t) return null;
    return (
      <button key={id} onClick={onClick}
        style={{ padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: active ? t.color + 'bb' : 'rgba(255,255,255,0.05)', color: active ? t.text : '#64748b', border: `2px solid ${active ? t.color : 'rgba(255,255,255,0.1)'}` }}>
        {t.name}
      </button>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{label} — Edit</div>

        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Court</p>
          <input value={courtNum} onChange={e => setCourtNum(e.target.value)} className="input-dark w-full"
            style={{ fontSize: 14, padding: '6px 10px', border: `1px solid ${courtValid ? 'rgba(255,255,255,0.15)' : '#ef4444'}` }} />
          {!courtValid && <p className="text-xs text-amber-400 mt-1">Court name is required.</p>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Team A</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chipBtn(id, teamAId === id, () => { setTeamAId(id); if (teamBId === id) setTeamBId(teamAId); }))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: teamA ? `${teamA.color}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${teamA ? teamA.color : 'rgba(255,255,255,0.1)'}` }}>
              {teamA && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamA.color }} />}
              <span className="font-bold text-sm flex-1">{teamA?.name || '—'}</span>
            </div>
            <NumInput value={scoreA} onChange={setScoreA} />
          </div>
        </div>

        <div className="text-center text-slate-600 text-xs font-bold">VS</div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Team B</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map(id => chipBtn(id, teamBId === id, () => { setTeamBId(id); if (teamAId === id) setTeamAId(teamBId); }))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ background: teamB ? `${teamB.color}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${teamB ? teamB.color : 'rgba(255,255,255,0.1)'}` }}>
              {teamB && <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamB.color }} />}
              <span className="font-bold text-sm flex-1">{teamB?.name || '—'}</span>
            </div>
            <NumInput value={scoreB} onChange={setScoreB} />
          </div>
        </div>

        {teamsChanged && <div className="notice-amber">⚠️ Teams changed — byes for this round will be recalculated.</div>}
        {valid && newWinnerId && <p className="text-xs text-green-400 text-center">→ {teamById(newWinnerId)?.name} wins {newWinnerScore}–{newLoserScore}</p>}
        {!scoresValid && scoreA !== '' && scoreB !== '' && <p className="text-xs text-amber-400 text-center">Scores can't be equal.</p>}
        {!teamsValid && teamAId === teamBId && <p className="text-xs text-amber-400 text-center">Teams must be different.</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
