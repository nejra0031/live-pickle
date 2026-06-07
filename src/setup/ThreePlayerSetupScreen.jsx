import { useState } from 'react';
import { ALL_TEAMS } from '../constants';
import PlayerNameField from '../components/PlayerNameField';
import useKnownPlayers from '../hooks/useKnownPlayers';

const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const PALETTE = ALL_TEAMS.map(t => ({ color: t.color, text: t.text }));
const PRESET_COURTS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const emptyPlayer = () => ({ name: '', duprId: '' });

function mkTeam(idx) {
  const pal = PALETTE[idx % PALETTE.length];
  return { id: uid(), name: '', male1: emptyPlayer(), male2: emptyPlayer(), female: emptyPlayer(), color: pal.color, text: pal.text };
}

export default function ThreePlayerSetupScreen({ onStart }) {
  const [teams, setTeams] = useState([mkTeam(0), mkTeam(1)]);
  const [courts, setCourts] = useState([]);
  const [courtInput, setCourtInput] = useState('');
  const [courtInputError, setCourtInputError] = useState('');
  const [timerMins, setTimerMins] = useState(12);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [title, setTitle] = useState('Tournament');
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  const validTeams = teams.filter(t => t.name.trim() && t.male1.name.trim() && t.male2.name.trim() && t.female.name.trim());
  const minCourts = Math.max(1, Math.floor(validTeams.length / 2));
  const totalRounds = validTeams.length >= 2 ? validTeams.length - 1 : 0;
  const totalGames = validTeams.length >= 2 ? totalRounds * Math.floor(validTeams.length / 2) * 3 : 0;
  const canStart = validTeams.length >= 2 && courts.length >= minCourts;

  const updateTeam = (id, field, value) => setTeams(p => p.map(t => t.id === id ? { ...t, [field]: value } : t));
  const updatePlayer = (id, slot, val) => setTeams(p => p.map(t => t.id === id ? { ...t, [slot]: val } : t));
  const addTeam = () => setTeams(p => [...p, mkTeam(p.length)]);
  const removeTeam = id => { if (teams.length > 2) setTeams(p => p.filter(t => t.id !== id)); };

  const addCourt = () => {
    const v = courtInput.trim();
    if (!v) { setCourtInput(''); return; }
    if (courts.includes(v)) { setCourtInputError('Court already added.'); setCourtInput(''); return; }
    setCourts(p => [...p, v]);
    setCourtInput(''); setCourtInputError('');
  };
  const toggleCourt = v => {
    if (courts.includes(v)) { setCourts(p => p.filter(x => x !== v)); }
    else { setCourts(p => [...p, v].sort((a, b) => { const na = Number(a), nb = Number(b); return (na && nb) ? na - nb : a.localeCompare(b); })); }
  };

  const handleStart = () => {
    if (!canStart) return;
    const tptTeams = {}, players = {};
    validTeams.forEach(t => {
      const m1id = uid(), m2id = uid(), fid = uid();
      tptTeams[t.id] = { id: t.id, name: t.name.trim(), color: t.color, text: t.text, maleIds: [m1id, m2id], femaleId: fid };
      players[m1id] = { id: m1id, name: t.male1.name.trim(), duprId: t.male1.duprId.trim(), teamId: t.id, gender: 'male' };
      players[m2id] = { id: m2id, name: t.male2.name.trim(), duprId: t.male2.duprId.trim(), teamId: t.id, gender: 'male' };
      players[fid]  = { id: fid,  name: t.female.name.trim(), duprId: t.female.duprId.trim(), teamId: t.id, gender: 'female' };
      saveKnownPlayer(t.male1.name, t.male1.duprId);
      saveKnownPlayer(t.male2.name, t.male2.duprId);
      saveKnownPlayer(t.female.name, t.female.duprId);
    });
    onStart(tptTeams, players, courts, timerEnabled ? timerMins * 60 : 0, title.trim() || 'Tournament');
  };

  const iS = { padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', color: '#1e293b', outline: 'none' };

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Tournament Name</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tournament"
          style={{ ...iS, width: '100%', fontSize: 15, fontWeight: 800, color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)' }} />
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Teams</p>
        <p className="text-slate-500 text-xs mb-3">Each team: 2 male players + 1 female player. Top male = M1, bottom = M2 (rotation order).</p>
        <div className="flex flex-col gap-3">
          {teams.map((team, idx) => (
            <div key={team.id} className="rounded-xl p-3 flex flex-col gap-2"
              style={{ border: `2px solid ${team.color}55`, background: `${team.color}10` }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: team.color }} />
                <input value={team.name} onChange={e => updateTeam(team.id, 'name', e.target.value)}
                  placeholder="Team name"
                  style={{ ...iS, flex: 1, fontWeight: 800, fontSize: 14, color: '#0f4c75', border: `1px solid ${team.color}66` }} />
                <button onClick={() => removeTeam(team.id)} disabled={teams.length <= 2}
                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: teams.length <= 2 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.08)', color: teams.length <= 2 ? '#94a3b8' : '#dc2626', border: '1px solid rgba(220,38,38,0.15)', flexShrink: 0 }}>×</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <p className="font-bold mb-1" style={{ fontSize: 11, color: '#1d4ed8' }}>♂ Male 1</p>
                  <PlayerNameField name={team.male1.name} duprId={team.male1.duprId} knownPlayers={knownPlayers}
                    onChange={val => updatePlayer(team.id, 'male1', val)}
                    inputStyle={{ ...iS, width: '100%', fontSize: 12 }} />
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ fontSize: 11, color: '#1d4ed8' }}>♂ Male 2</p>
                  <PlayerNameField name={team.male2.name} duprId={team.male2.duprId} knownPlayers={knownPlayers}
                    onChange={val => updatePlayer(team.id, 'male2', val)}
                    inputStyle={{ ...iS, width: '100%', fontSize: 12 }} />
                </div>
                <div>
                  <p className="font-bold mb-1" style={{ fontSize: 11, color: '#be185d' }}>♀ Female</p>
                  <PlayerNameField name={team.female.name} duprId={team.female.duprId} knownPlayers={knownPlayers}
                    onChange={val => updatePlayer(team.id, 'female', val)}
                    inputStyle={{ ...iS, width: '100%', fontSize: 12 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={addTeam} className="mt-3 w-full py-2 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px dashed rgba(15,76,117,0.3)', cursor: 'pointer' }}>
          + Add team
        </button>
        <p className="text-slate-500 text-xs mt-2">{validTeams.length} complete team{validTeams.length !== 1 ? 's' : ''}</p>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-700 mb-3">Courts to Use</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_COURTS.map(n => {
            const sel = courts.includes(n);
            return (
              <button key={n} onClick={() => toggleCourt(n)} className="rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: sel ? 'rgba(15,76,117,0.15)' : 'rgba(0,0,0,0.06)', color: sel ? '#0f4c75' : '#64748b', border: '2px solid ' + (sel ? 'rgba(15,76,117,0.5)' : 'rgba(0,0,0,0.1)'), cursor: 'pointer' }}>
                {n}
              </button>
            );
          })}
        </div>
        {courts.filter(c => !PRESET_COURTS.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {courts.filter(c => !PRESET_COURTS.includes(c)).map(c => (
              <div key={c} className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: 'rgba(15,76,117,0.15)', color: '#0f4c75', border: '2px solid rgba(15,76,117,0.4)' }}>
                {c}
                <button onClick={() => setCourts(p => p.filter(x => x !== c))} style={{ cursor: 'pointer', marginLeft: 4, fontWeight: 900, background: 'none', border: 'none', color: '#0f4c75' }}>×</button>
              </div>
            ))}
          </div>
        )}
        <p className="text-slate-500 text-xs mb-2">Or enter a custom court name:</p>
        <div className="flex gap-2">
          <input placeholder="Name or number" value={courtInput}
            onChange={e => { setCourtInput(e.target.value); setCourtInputError(''); }}
            onKeyDown={e => e.key === 'Enter' && addCourt()}
            style={{ ...iS, flex: 1 }} />
          <button onClick={addCourt} className="px-3 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(15,76,117,0.15)', color: '#0f4c75', cursor: 'pointer', border: '1px solid rgba(15,76,117,0.3)' }}>
            + Add
          </button>
        </div>
        {courtInputError && <p className="text-amber-600 text-xs mt-1">{courtInputError}</p>}
        <p className="text-slate-500 text-xs mt-2">{courts.length} court{courts.length !== 1 ? 's' : ''}{courts.length > 0 ? ': ' + courts.join(', ') : ''}</p>
        {validTeams.length >= 2 && courts.length < minCourts && (
          <p className="text-amber-600 text-xs mt-1">⚠ Need at least {minCourts} court{minCourts !== 1 ? 's' : ''} for {validTeams.length} team{validTeams.length !== 1 ? 's' : ''}.</p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
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
              style={{ ...iS, width: 64, textAlign: 'center', fontSize: 14 }} />
            <span className="text-slate-600 text-sm">minutes per round</span>
          </div>
        )}
      </div>

      {validTeams.length >= 2 && (
        <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
          {validTeams.length} teams · {totalRounds} scheduling round{totalRounds !== 1 ? 's' : ''} · {minCourts} court{minCourts !== 1 ? 's' : ''} needed · {totalGames} total games{timerEnabled ? ` · ${timerMins} min rounds` : ''}
        </div>
      )}

      {!canStart && validTeams.length < 2 && (
        <p className="text-amber-600 text-xs text-center">Need at least 2 complete teams.</p>
      )}

      <button onClick={handleStart} disabled={!canStart} className="w-full py-3 rounded-xl font-bold text-base btn-blue">
        Start Tournament 🚀
      </button>
    </div>
  );
}
