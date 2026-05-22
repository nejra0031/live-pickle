import { useState } from 'react';
import { ALL_TEAMS } from '../constants';

const PRESET = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function computeStats(numTeams, numCourts, numRounds) {
  if (numTeams < 2 || numCourts < 1 || numRounds < 1) return null;
  // A team can only play once per round, so effective courts = min(courts, floor(teams/2))
  const effectiveCourts = Math.min(numCourts, Math.floor(numTeams / 2));
  const playsPerRound = effectiveCourts * 2;
  const totalBefore = (numRounds - 1) * playsPerRound;
  const teamsAtMax = totalBefore % numTeams;
  let finalCourts, minGames, maxGames;
  if (teamsAtMax === 0) {
    finalCourts = effectiveCourts;
    const totalAfter = totalBefore + finalCourts * 2;
    maxGames = Math.ceil(totalAfter / numTeams);
    minGames = Math.floor(totalAfter / numTeams);
  } else {
    const teamsBelowMax = numTeams - teamsAtMax;
    finalCourts = Math.min(effectiveCourts, Math.floor(teamsBelowMax / 2));
    const maxBefore = Math.ceil(totalBefore / numTeams);
    const minBefore = Math.floor(totalBefore / numTeams);
    const teamsEqualized = 2 * finalCourts;
    if (teamsBelowMax - teamsEqualized > 0) {
      minGames = minBefore;
      maxGames = maxBefore;
    } else {
      minGames = maxGames = maxBefore;
    }
  }
  return { minGames, maxGames, finalCourts, rounds: numRounds };
}

function computeRoundsForGames(numTeams, numCourts, targetGames) {
  if (numTeams < 2 || numCourts < 1 || targetGames < 1) return null;
  for (let r = 1; r <= 200; r++) {
    const s = computeStats(numTeams, numCourts, r);
    if (s && s.maxGames >= targetGames) return s;
  }
  return null;
}

export default function SetupScreen({ onStart }) {
  const [colorTeams, setColorTeams] = useState(ALL_TEAMS.map(t => ({ ...t, selected: false, customName: t.name })));
  const [editingId, setEditingId] = useState(null);
  const [courts, setCourts] = useState([]);
  const [courtInput, setCourtInput] = useState('');
  const [courtInputError, setCourtInputError] = useState('');
  const [timerMins, setTimerMins] = useState(12);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [title, setTitle] = useState('Tournament');
  const [targetMode, setTargetMode] = useState('rounds'); // 'rounds' | 'games'
  const [numRounds, setNumRounds] = useState(0);
  const [numGames, setNumGames] = useState(0);

  const selectedTeams = colorTeams.filter(t => t.selected).map(t => ({ id: t.id, name: t.customName || t.name, color: t.color, text: t.text }));
  const allTeamIds = selectedTeams.map(t => t.id);
  const effectiveCourts = Math.min(courts.length, Math.floor(allTeamIds.length / 2));
  const stats = targetMode === 'rounds'
    ? (numRounds > 0 ? computeStats(allTeamIds.length, courts.length, numRounds) : null)
    : (numGames > 0 ? computeRoundsForGames(allTeamIds.length, courts.length, numGames) : null);
  const parsedRounds = stats ? stats.rounds : 0;

  const addCourt = () => {
    const v = courtInput.trim();
    if (!v) { setCourtInput(''); return; }
    if (courts.includes(v)) { setCourtInputError('Court already added.'); setCourtInput(''); return; }
    setCourts(p => [...p, v]);
    setCourtInput('');
    setCourtInputError('');
  };

  const toggleCourt = v => {
    if (courts.includes(v)) {
      setCourts(p => p.filter(x => x !== v));
    } else {
      setCourts(p => [...p, v].sort((a, b) => {
        const na = Number(a), nb = Number(b);
        return (na && nb) ? na - nb : a.localeCompare(b);
      }));
    }
  };

  const canStart = allTeamIds.length >= 3 && courts.length >= 1;

  const iS = { padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', color: '#1e293b', outline: 'none' };

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Tournament Name</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tournament"
          style={{ ...iS, width: '100%', fontSize: 15, fontWeight: 800, color: '#0f4c75', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(15,76,117,0.2)' }} />
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Teams</p>
        <p className="text-slate-500 text-xs mb-3">Tap to select · Tap ✏️ to rename</p>
        <div className="flex flex-wrap gap-2">
          {colorTeams.map(t => {
            const sel = t.selected, editing = editingId === t.id;
            return (
              <div key={t.id}>
                {editing ? (
                  <div className="flex items-center gap-1 rounded-full px-2 py-1" style={{ background: t.color, border: `2px solid ${t.color}` }}>
                    <input autoFocus value={t.customName}
                      onChange={e => setColorTeams(p => p.map(x => x.id === t.id ? { ...x, customName: e.target.value } : x))}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingId(null); }}
                      style={{ width: Math.max(50, (t.customName || '').length * 8 + 16), background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 99, padding: '2px 6px', color: t.text, fontWeight: 700, fontSize: 12, outline: 'none' }} />
                  </div>
                ) : (
                  <button className="rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1"
                    style={{ background: sel ? t.color : 'rgba(0,0,0,0.06)', color: sel ? t.text : '#64748b', border: '2px solid ' + (sel ? t.color : 'rgba(0,0,0,0.12)'), cursor: 'pointer' }}>
                    <span onClick={() => setColorTeams(p => p.map(x => x.id === t.id ? { ...x, selected: !x.selected } : x))}>{t.customName || t.name}</span>
                    {sel && <span onClick={e => { e.stopPropagation(); setEditingId(t.id); }} style={{ cursor: 'text', opacity: 0.7, fontSize: 10, marginLeft: 2 }} title="Rename">✏️</span>}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-slate-600 text-xs mt-3 font-bold">{allTeamIds.length} team{allTeamIds.length !== 1 ? 's' : ''} selected</p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Courts to Use</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET.map(n => {
            const s = courts.includes(n);
            return (
              <button key={n} onClick={() => toggleCourt(n)} className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: s ? 'rgba(15,76,117,0.15)' : 'rgba(0,0,0,0.06)', color: s ? '#0f4c75' : '#64748b', border: '2px solid ' + (s ? 'rgba(15,76,117,0.5)' : 'rgba(0,0,0,0.1)'), cursor: 'pointer' }}>
                {n}
              </button>
            );
          })}
        </div>
        {courts.filter(c => !PRESET.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {courts.filter(c => !PRESET.includes(c)).map(c => (
              <div key={c} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: 'rgba(15,76,117,0.15)', color: '#0f4c75', border: '2px solid rgba(15,76,117,0.4)' }}>
                {c}
                <button onClick={() => setCourts(p => p.filter(x => x !== c))} style={{ cursor: 'pointer', marginLeft: 4, fontWeight: 900, background: 'none', border: 'none', color: '#0f4c75' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-slate-500 text-xs mb-2">Or enter any custom court name:</p>
        <div className="flex gap-2">
          <input placeholder="Name or number" value={courtInput}
            onChange={e => { setCourtInput(e.target.value); setCourtInputError(''); }}
            onKeyDown={e => e.key === 'Enter' && addCourt()}
            style={{ ...iS, flex: 1, background: 'rgba(255,255,255,0.7)', color: '#1e293b', border: '1px solid rgba(0,0,0,0.15)' }} />
          <button onClick={addCourt} className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(15,76,117,0.15)', color: '#0f4c75', cursor: 'pointer', border: '1px solid rgba(15,76,117,0.3)' }}>
            + Add
          </button>
        </div>
        {courtInputError && <p className="text-amber-600 text-xs mt-1">{courtInputError}</p>}
        <p className="text-slate-500 text-xs mt-2">{courts.length} court{courts.length !== 1 ? 's' : ''}: {courts.join(', ')}</p>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <p className="text-sm font-bold text-slate-700">Round Timer</p>
          <button onClick={() => setTimerEnabled(p => !p)} className="text-xs px-2 py-1 rounded-lg font-bold"
            style={{ background: timerEnabled ? 'rgba(15,76,117,0.15)' : 'rgba(0,0,0,0.06)', color: timerEnabled ? '#0f4c75' : '#94a3b8', cursor: 'pointer', border: '1px solid ' + (timerEnabled ? 'rgba(15,76,117,0.4)' : 'rgba(0,0,0,0.1)') }}>
            {timerEnabled ? 'On' : 'Off'}
          </button>
        </div>
        {timerEnabled && (
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={99} value={timerMins}
              onChange={e => setTimerMins(Math.max(1, Number(e.target.value)))}
              style={{ ...iS, width: 64, textAlign: 'center', fontSize: 14, background: 'rgba(255,255,255,0.7)', color: '#1e293b', border: '1px solid rgba(0,0,0,0.15)' }} />
            <span className="text-slate-600 text-sm">minutes per round</span>
          </div>
        )}
        {timerEnabled && <p className="text-slate-500 text-xs mt-2">A loud alarm sounds when time runs out.</p>}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm font-bold text-slate-700">Number of rounds/games</p>
          <span className="text-xs text-slate-400">optional</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {['rounds', 'games'].map(m => (
            <button key={m} onClick={() => setTargetMode(m)}
              style={{ padding: '3px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: targetMode === m ? 'rgba(15,76,117,0.15)' : 'rgba(0,0,0,0.05)', color: targetMode === m ? '#0f4c75' : '#94a3b8', border: '1px solid ' + (targetMode === m ? 'rgba(15,76,117,0.4)' : 'rgba(0,0,0,0.1)') }}>
              {m === 'rounds' ? 'Set rounds' : 'Set games/team'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {targetMode === 'rounds' ? (
            <>
              <input type="number" min={1} max={99} value={numRounds || ''}
                onChange={e => setNumRounds(e.target.value ? Math.max(1, Number(e.target.value)) : 0)}
                placeholder="–"
                style={{ ...iS, width: 64, textAlign: 'center', fontSize: 14, background: 'rgba(255,255,255,0.7)', color: '#1e293b', border: '1px solid rgba(0,0,0,0.15)' }} />
              <span className="text-slate-600 text-sm">rounds total</span>
            </>
          ) : (
            <>
              <input type="number" min={1} max={99} value={numGames || ''}
                onChange={e => setNumGames(e.target.value ? Math.max(1, Number(e.target.value)) : 0)}
                placeholder="–"
                style={{ ...iS, width: 64, textAlign: 'center', fontSize: 14, background: 'rgba(255,255,255,0.7)', color: '#1e293b', border: '1px solid rgba(0,0,0,0.15)' }} />
              <span className="text-slate-600 text-sm">games per team</span>
            </>
          )}
        </div>
        {stats && (
          <p className="text-slate-500 text-xs mt-2">
            {targetMode === 'rounds'
              ? <>Teams play <strong>{stats.minGames === stats.maxGames ? stats.minGames : `${stats.minGames}–${stats.maxGames}`}</strong> game{stats.maxGames !== 1 ? 's' : ''}</>
              : <>Takes <strong>{stats.rounds}</strong> round{stats.rounds !== 1 ? 's' : ''}</>
            }
            {' · '}Final round uses <strong>{stats.finalCourts}</strong> court{stats.finalCourts !== 1 ? 's' : ''}
          </p>
        )}
        {!stats && (targetMode === 'rounds' ? numRounds > 0 : numGames > 0) && (
          <p className="text-slate-400 text-xs mt-2">Select teams and courts to see details.</p>
        )}
      </div>

      <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
        {courts.length} court{courts.length !== 1 ? 's' : ''} → {effectiveCourts * 2} play, {Math.max(0, allTeamIds.length - effectiveCourts * 2)} bye per round{timerEnabled ? ' · ' + timerMins + ' min rounds' : ''}.<br />
        No back-to-back byes. Bye partnerships rotate.
      </div>

      {!canStart && (
        <p className="text-amber-600 text-xs text-center">
          {allTeamIds.length < 3 ? 'Need at least 3 teams.' : courts.length < 1 ? 'Need at least 1 court.' : ''}
        </p>
      )}

      <button onClick={() => canStart && onStart(selectedTeams, allTeamIds, courts, timerEnabled ? timerMins * 60 : 0, title, parsedRounds)}
        disabled={!canStart} className="w-full py-3 rounded-xl font-bold text-base btn-blue">
        Start Tournament 🚀
      </button>
    </div>
  );
}
