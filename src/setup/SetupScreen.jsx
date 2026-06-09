import { useState } from 'react';
import { ALL_TEAMS } from '../constants';
import EventDetailsFields from './EventDetailsFields';
import PlayerNameField from '../components/PlayerNameField';
import useKnownPlayers from '../hooks/useKnownPlayers';
import { isValidDoublesRRPlayerCount, nearestValidDoublesRRPlayerCounts, generateDoublesRRSchedule } from '../algorithms/doublesRR';
import { generateRoundRobinSchedule } from '../algorithms/roundRobin';

const PRESET = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const PALETTE = ALL_TEAMS.map(t => ({ name: t.name, color: t.color, text: t.text }));

// Stats for R rounds where the final round may use fewer courts to equalise.
// Returns { minGames, maxGames, finalCourts, rounds }.
function computeStats(numTeams, numCourts, numRounds) {
  if (numTeams < 2 || numCourts < 1 || numRounds < 1) return null;
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

// Returns all game counts ≤ max where every team plays exactly that many games,
// accounting for the final round potentially using fewer courts to equalise.
function getValidGameCounts(numTeams, numCourts, max = 30) {
  if (numTeams < 2 || numCourts < 1) return [];
  const seen = new Set();
  const results = [];
  for (let r = 1; r <= 500; r++) {
    const s = computeStats(numTeams, numCourts, r);
    if (!s) continue;
    if (s.minGames === s.maxGames && s.minGames > 0 && s.minGames <= max && !seen.has(s.minGames)) {
      seen.add(s.minGames);
      results.push(s.minGames);
    }
    if (s.minGames > max) break;
  }
  return results.sort((a, b) => a - b);
}

function roundsForGames(numTeams, numCourts, targetGames) {
  for (let r = 1; r <= 500; r++) {
    const s = computeStats(numTeams, numCourts, r);
    if (s && s.minGames === s.maxGames && s.minGames === targetGames) return r;
  }
  return null;
}

const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const emptyDraft = () => ({ name: '', duprId: '', nickname: '' });
const emptySlot = gender => ({ id: uid(), name: '', duprId: '', nickname: '', gender });

// Each option pairs an engine `format` with a `startMode` ('swiss' starts in
// the round-by-round Swiss phase; 'roundrobin' generates the full schedule up
// front and opens directly in Round Robin mode — see App.jsx:handleStart).
// Doubles RR (rotating partners) and Trio are inherently round-robin formats —
// they always pre-generate their full schedule, so there's no Swiss variant.
const FORMAT_OPTIONS = [
  { id: 'singles-swiss',      format: 'singles',      startMode: 'swiss',      label: '🎾 Singles', sub: 'Swiss' },
  { id: 'singles-rr',         format: 'singles',      startMode: 'roundrobin', label: '🎾 Singles', sub: 'Round Robin' },
  { id: 'fixedpartner-swiss', format: 'fixedpartner', startMode: 'swiss',      label: '👫 Doubles · Fixed Partners', sub: 'Swiss' },
  { id: 'fixedpartner-rr',    format: 'fixedpartner', startMode: 'roundrobin', label: '👫 Doubles · Fixed Partners', sub: 'Round Robin' },
  { id: 'doublesrr',          format: 'doublesrr',    startMode: 'roundrobin', label: '🤝 Doubles · Rotating Partners', sub: 'Round Robin' },
  { id: 'trio',               format: 'trio',         startMode: 'roundrobin', label: '👥 Trio Teams', sub: 'Round Robin' },
];

const SLOT_GENDERS = { fixedpartner: ['', ''], trio: ['M', 'M', 'F'] };

function mkTeamCard(idx, format) {
  const pal = PALETTE[idx % PALETTE.length];
  return { id: uid(), name: pal.name, color: pal.color, text: pal.text, players: SLOT_GENDERS[format].map(emptySlot) };
}

// Carries team name/color/players across a format switch between the two
// team-card formats, only adjusting the player-slot count and gender defaults.
// Slots that don't fit the new format (e.g. trio's 3rd player when switching
// to fixed-partner's 2) are stashed in `_overflow` so they come back intact
// if the admin switches back rather than being silently dropped.
function remapTeamCards(prevTeams, nextFormat) {
  const defaults = SLOT_GENDERS[nextFormat];
  return prevTeams.map(t => {
    const allSlots = [...t.players, ...(t._overflow || [])];
    const players = defaults.map((defGender, i) => {
      const prev = allSlots[i];
      return prev ? { ...prev, gender: prev.gender || defGender } : emptySlot(defGender);
    });
    const overflow = allSlots.slice(defaults.length);
    return { ...t, players, _overflow: overflow.length ? overflow : undefined };
  });
}

const iS = { padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', color: '#1e293b', outline: 'none' };

function FormatSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {FORMAT_OPTIONS.map(f => {
        const active = value === f.id;
        return (
          <button key={f.id} onClick={() => onChange(f)} type="button"
            className="rounded-xl px-4 py-3 flex flex-col items-start text-left gap-1"
            style={{
              background: active ? 'linear-gradient(135deg,#0f4c75,#1a6fa8)' : 'rgba(255,255,255,0.55)',
              color: active ? '#fff' : '#334155',
              border: '1px solid ' + (active ? 'transparent' : 'rgba(0,0,0,0.1)'),
              cursor: 'pointer',
              minHeight: 72,
            }}>
            <p className="font-bold text-base" style={{ margin: 0 }}>{f.label}</p>
            <span className="font-bold" style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em', textTransform: 'uppercase',
              background: active ? 'rgba(255,255,255,0.18)' : 'rgba(15,76,117,0.1)',
              color: active ? '#e0f2fe' : '#0f4c75',
            }}>
              {f.sub === 'Swiss' ? '🔄 Swiss' : '🔁 Round Robin'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ColorPickerDot({ color, isOpen, onToggle, onPick, size = 16 }) {
  return (
    <div className="relative flex-shrink-0">
      <button type="button" title="Change color" onClick={onToggle}
        className="rounded-full" style={{ width: size, height: size, background: color, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.2)' }} />
      {isOpen && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 40 }} onClick={onToggle} />
          <div className="absolute top-full left-0 mt-1 grid grid-cols-5 gap-1.5 p-2 rounded-xl"
            style={{ zIndex: 50, width: 168, background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
            {PALETTE.map(p => (
              <button key={p.name} type="button" title={p.name} onClick={() => onPick(p)}
                className="w-6 h-6 rounded-full"
                style={{ background: p.color, cursor: 'pointer', border: color === p.color ? '2px solid #fff' : '2px solid transparent' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GenderToggle({ value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(0,0,0,0.15)' }}>
      {['M', 'F'].map(g => (
        <button key={g} onClick={() => onChange(value === g ? '' : g)} type="button"
          style={{
            padding: '3px 9px', fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
            background: value === g ? (g === 'M' ? '#3b82f6' : '#ec4899') : 'rgba(0,0,0,0.05)',
            color: value === g ? '#fff' : '#64748b',
          }}>
          {g}
        </button>
      ))}
    </div>
  );
}

export default function SetupScreen({ onStart, onStartTPT, onStartDoublesRR }) {
  // Wizard step: 1 = format, 2 = event details, 3 = roster/courts/timer/start
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState('singles');
  const [startMode, setStartMode] = useState('swiss');

  // Shared
  const [title, setTitle] = useState('Tournament');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMins, setDurationMins] = useState(0);
  const [courts, setCourts] = useState([]);
  const [courtInput, setCourtInput] = useState('');
  const [courtInputError, setCourtInputError] = useState('');
  const [timerMins, setTimerMins] = useState(12);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [numGames, setNumGames] = useState(0);
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  // Roster state — singles/doublesrr use a flat player list, fixedpartner/trio use team cards
  const [flatPlayers, setFlatPlayers] = useState([]);
  const [playerDraft, setPlayerDraft] = useState(emptyDraft());
  const [teams, setTeams] = useState([]);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [colorPickerTeamId, setColorPickerTeamId] = useState(null);
  const [flatColorPickerId, setFlatColorPickerId] = useState(null);

  const isFlat = format === 'singles' || format === 'doublesrr';
  const isTeamCards = format === 'fixedpartner' || format === 'trio';

  const selectFormatOption = opt => {
    const next = opt.format;
    if (next === format && opt.startMode === startMode) { setStep(2); return; }
    const wasFlat = isFlat, wasTeamCards = isTeamCards;
    const nextFlat = next === 'singles' || next === 'doublesrr';
    const nextTeamCards = next === 'fixedpartner' || next === 'trio';
    setFormat(next);
    setStartMode(opt.startMode);
    if (!(wasFlat && nextFlat)) {
      setFlatPlayers([]);
      setPlayerDraft(emptyDraft());
    }
    if (nextTeamCards) {
      setTeams(prev => remapTeamCards(wasTeamCards && prev.length ? prev : [mkTeamCard(0, next), mkTeamCard(1, next)], next));
    } else if (wasTeamCards) {
      setTeams([]);
    }
    setEditingTeamId(null);
    setColorPickerTeamId(null);
    setFlatColorPickerId(null);
    setNumGames(0);
    setStep(2);
  };
  const selectedFormatOptionId = FORMAT_OPTIONS.find(o => o.format === format && o.startMode === startMode)?.id ?? null;

  // ── Flat-list handlers (singles / doublesrr) ──
  const addFlatPlayer = () => {
    const name = playerDraft.name.trim();
    if (!name) return;
    const duprId = playerDraft.duprId.trim(), nickname = playerDraft.nickname.trim();
    const pal = PALETTE[flatPlayers.length % PALETTE.length];
    setFlatPlayers(p => [...p, { id: uid(), name, duprId, nickname, color: pal.color, text: pal.text }]);
    saveKnownPlayer(name, duprId, nickname);
    setPlayerDraft(emptyDraft());
  };
  const removeFlatPlayer = id => setFlatPlayers(p => p.filter(x => x.id !== id));
  const changeFlatPlayerColor = (id, pal) => setFlatPlayers(p => p.map(x => x.id === id ? { ...x, color: pal.color, text: pal.text } : x));

  // ── Team-card handlers (fixedpartner / trio) ──
  const addTeamCard = () => setTeams(p => [...p, mkTeamCard(p.length, format)]);
  const removeTeamCard = id => { if (teams.length > 1) setTeams(p => p.filter(t => t.id !== id)); };
  const renameTeamCard = (id, name) => setTeams(p => p.map(t => t.id === id ? { ...t, name } : t));
  // If the team's name still matches its current default (color name), follow the new color;
  // a custom name is left untouched.
  const changeTeamColor = (id, pal) => setTeams(p => p.map(t => {
    if (t.id !== id) return t;
    const isDefaultName = PALETTE.some(c => c.name === t.name.trim());
    return { ...t, color: pal.color, text: pal.text, name: isDefaultName ? pal.name : t.name };
  }));
  const updateSlot = (teamId, slotIdx, patch) => setTeams(p => p.map(t =>
    t.id === teamId ? { ...t, players: t.players.map((s, i) => i === slotIdx ? { ...s, ...patch } : s) } : t
  ));

  // ── Derived roster → selectedTeams (Swiss/RR engine shape) ──
  let selectedTeams = [];
  if (format === 'singles') {
    selectedTeams = flatPlayers.filter(p => p.name.trim()).map(p => ({
      id: p.id, name: p.name.trim(), color: p.color, text: p.text,
      players: [{ name: p.name, duprId: p.duprId, nickname: p.nickname }],
    }));
  } else if (format === 'fixedpartner') {
    selectedTeams = teams
      .filter(t => t.name.trim() && t.players.every(s => s.name.trim()))
      .map(t => ({
        id: t.id, name: t.name.trim(), color: t.color, text: t.text,
        players: t.players.map(s => ({ name: s.name, duprId: s.duprId, nickname: s.nickname, gender: s.gender })),
      }));
  }
  const allTeamIds = selectedTeams.map(t => t.id);

  // Trio teams need a name + 3 named players + exactly 2 male / 1 female (the TPT engine's hard requirement)
  const trioFilledTeams = format === 'trio'
    ? teams.filter(t => t.name.trim() && t.players.every(s => s.name.trim()))
    : [];
  const trioGenderOk = t => t.players.filter(s => s.gender === 'M').length === 2 && t.players.filter(s => s.gender === 'F').length === 1;
  const trioReadyTeams = trioFilledTeams.filter(trioGenderOk);
  const trioBadGenderCount = trioFilledTeams.length - trioReadyTeams.length;

  const effectiveCourts = Math.min(courts.length, Math.floor(allTeamIds.length / 2));
  const validCounts = getValidGameCounts(allTeamIds.length, courts.length);
  const selectedGames = validCounts.includes(numGames) ? numGames : 0;
  const parsedRounds = selectedGames > 0 ? roundsForGames(allTeamIds.length, courts.length, selectedGames) : 0;

  // Preview of the up-front-generated schedule for direct Round Robin starts
  // (singles / fixed-partner doubles) — mirrors what RoundRobinSection shows in-app.
  const rrPreviewSchedule = (startMode === 'roundrobin' && (format === 'singles' || format === 'fixedpartner') && allTeamIds.length >= 2 && courts.length >= 1)
    ? generateRoundRobinSchedule(allTeamIds, courts.length)
    : [];

  const trioMinCourts = Math.max(1, Math.floor(trioReadyTeams.length / 2));
  const trioTotalRounds = trioReadyTeams.length >= 2 ? (trioReadyTeams.length % 2 === 0 ? trioReadyTeams.length - 1 : trioReadyTeams.length) : 0;
  const trioTotalGames = trioReadyTeams.length >= 2 ? trioTotalRounds * Math.floor(trioReadyTeams.length / 2) * 3 : 0;

  // ── Courts handlers (shared) ──
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

  // Doubles RR: a flat list of named players, valid only when N % 4 is 0 or 1
  // (see isValidDoublesRRPlayerCount — every round must split into complete 2v2 courts).
  const doublesRRNamedPlayers = format === 'doublesrr' ? flatPlayers.filter(p => p.name.trim()) : [];
  const doublesRRCountValid = isValidDoublesRRPlayerCount(doublesRRNamedPlayers.length);
  const doublesRRSuggestion = !doublesRRCountValid ? nearestValidDoublesRRPlayerCounts(doublesRRNamedPlayers.length) : null;
  // Actual physical-round count depends on courts (each logical round of partnerships
  // is chunked into courts.length-sized physical rounds) — so derive it from the
  // real schedule rather than a player-count-only formula.
  const doublesRRPreviewSchedule = (doublesRRCountValid && courts.length >= 1)
    ? generateDoublesRRSchedule(doublesRRNamedPlayers.map(p => p.id), courts.length)
    : [];

  const canStart =
    format === 'singles'      ? (allTeamIds.length >= 3 && courts.length >= 1) :
    format === 'fixedpartner' ? (allTeamIds.length >= 3 && courts.length >= 1) :
    format === 'trio'         ? (trioReadyTeams.length >= 2 && courts.length >= trioMinCourts) :
    format === 'doublesrr'    ? (doublesRRCountValid && courts.length >= 1) :
    false;

  const handleStart = () => {
    if (!canStart) return;
    const eventDetails = { location: location.trim(), startTime, durationMins };
    if (format === 'trio') {
      const tptTeams = {}, tptPlayersObj = {};
      trioReadyTeams.forEach(t => {
        const males = t.players.filter(s => s.gender === 'M');
        const female = t.players.find(s => s.gender === 'F');
        const m1id = uid(), m2id = uid(), fid = uid();
        tptTeams[t.id] = { id: t.id, name: t.name.trim(), color: t.color, text: t.text, maleIds: [m1id, m2id], femaleId: fid };
        tptPlayersObj[m1id] = { id: m1id, name: males[0].name.trim(), duprId: males[0].duprId.trim(), nickname: (males[0].nickname || '').trim(), teamId: t.id, gender: 'male' };
        tptPlayersObj[m2id] = { id: m2id, name: males[1].name.trim(), duprId: males[1].duprId.trim(), nickname: (males[1].nickname || '').trim(), teamId: t.id, gender: 'male' };
        tptPlayersObj[fid]  = { id: fid,  name: female.name.trim(),   duprId: female.duprId.trim(),   nickname: (female.nickname  || '').trim(), teamId: t.id, gender: 'female' };
        [...males, female].forEach(s => saveKnownPlayer(s.name, s.duprId, s.nickname));
      });
      onStartTPT(tptTeams, tptPlayersObj, courts, timerEnabled ? timerMins * 60 : 0, title.trim() || 'Tournament', eventDetails);
    } else if (format === 'doublesrr') {
      const playersData = {};
      doublesRRNamedPlayers.forEach(p => {
        playersData[p.id] = { id: p.id, name: p.name.trim(), duprId: p.duprId, nickname: p.nickname || '', color: p.color, text: p.text };
        saveKnownPlayer(p.name, p.duprId, p.nickname);
      });
      onStartDoublesRR(playersData, courts, timerEnabled ? timerMins * 60 : 0, title.trim() || 'Tournament', eventDetails);
    } else {
      if (format === 'fixedpartner') {
        teams.flatMap(t => t.players).forEach(s => { if (s.name.trim()) saveKnownPlayer(s.name, s.duprId, s.nickname); });
      }
      onStart(selectedTeams, allTeamIds, courts, timerEnabled ? timerMins * 60 : 0, title, parsedRounds, eventDetails, startMode);
    }
  };

  const backBtnS = { padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' };
  const nextBtnS = { padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', background: 'linear-gradient(135deg,#0f4c75,#1a6fa8)', color: '#fff', border: 'none' };

  return (
    <div className="flex flex-col gap-4">

      {step === 1 && (
        <div className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Tournament Format</p>
            <p className="text-slate-500 text-xs">Pick how teams are formed and how rounds are scheduled. This determines the rest of the setup.</p>
          </div>
          <FormatSelector value={selectedFormatOptionId} onChange={selectFormatOption} />
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl p-6 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between">
            <button onClick={() => setStep(1)} type="button" style={backBtnS}>← Back</button>
            <button onClick={() => setStep(3)} type="button" style={nextBtnS}>Next →</button>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Tournament Name</p>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tournament"
              style={{ ...iS, width: '100%', fontSize: 15, fontWeight: 800, color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)' }} />
          </div>

          <EventDetailsFields location={location} setLocation={setLocation}
            startTime={startTime} setStartTime={setStartTime}
            durationMins={durationMins} setDurationMins={setDurationMins} />

          <button onClick={() => setStep(3)} type="button" style={{ ...nextBtnS, alignSelf: 'flex-end' }}>Next →</button>
        </div>
      )}

      {step === 3 && (
      <div className="rounded-2xl p-6 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>

        <button onClick={() => setStep(2)} type="button" style={{ ...backBtnS, alignSelf: 'flex-start' }}>← Back</button>

        {isFlat && (
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Players</p>
            <p className="text-slate-500 text-xs mb-3">{format === 'singles' ? 'Each player plays as their own team — no team names needed.' : 'Add each player — partnerships are generated by the algorithm each round.'}</p>
            <div className="flex flex-col sm:flex-row gap-2 mb-3 items-start">
              <div style={{ flex: 1, minWidth: 0 }}>
                <PlayerNameField name={playerDraft.name} duprId={playerDraft.duprId} nickname={playerDraft.nickname} knownPlayers={knownPlayers}
                  onChange={val => setPlayerDraft(d => ({ name: val.name, duprId: val.duprId, nickname: val.nickname ?? d.nickname }))}
                  inputStyle={{ ...iS, width: '100%' }} />
              </div>
              <button onClick={addFlatPlayer} className="px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(15,76,117,0.15)', color: '#0f4c75', cursor: 'pointer', border: '1px solid rgba(15,76,117,0.3)' }}>
                + Add player
              </button>
            </div>
            {flatPlayers.length > 0 && (
              <div className="flex flex-col gap-1">
                {flatPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    {(format === 'singles' || format === 'doublesrr') && (
                      <ColorPickerDot color={p.color} size={14} isOpen={flatColorPickerId === p.id}
                        onToggle={() => setFlatColorPickerId(x => x === p.id ? null : p.id)}
                        onPick={pal => { changeFlatPlayerColor(p.id, pal); setFlatColorPickerId(null); }} />
                    )}
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#1e293b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}{p.duprId ? ` (${p.duprId})` : ''}{p.nickname ? ` - ${p.nickname}` : ''}
                    </span>
                    <button onClick={() => removeFlatPlayer(p.id)} style={{ cursor: 'pointer', fontWeight: 900, background: 'none', border: 'none', color: '#94a3b8', flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-slate-600 text-xs mt-3 font-bold">{flatPlayers.length} player{flatPlayers.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {isTeamCards && (
          <div>
            <p className="text-sm font-bold text-slate-700 mb-1">Teams</p>
            <p className="text-slate-500 text-xs mb-3">
              {format === 'trio'
                ? 'Each team: name + 3 players. Tap M/F to set each player’s gender (default 2 male, 1 female).'
                : 'Each team: name + 2 players. Tap M/F to optionally record each player’s gender.'}
            </p>
            <div className="flex flex-col gap-3">
              {teams.map((team, tIdx) => {
                const editing = editingTeamId === team.id;
                return (
                  <div key={team.id} className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ border: `2px solid ${team.color}55`, background: `${team.color}10` }}>
                    <div className="flex items-center gap-2">
                      <ColorPickerDot color={team.color} isOpen={colorPickerTeamId === team.id}
                        onToggle={() => setColorPickerTeamId(p => p === team.id ? null : team.id)}
                        onPick={pal => { changeTeamColor(team.id, pal); setColorPickerTeamId(null); }} />
                      {editing ? (
                        <input autoFocus value={team.name} onChange={e => renameTeamCard(team.id, e.target.value)}
                          onBlur={() => setEditingTeamId(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTeamId(null); }}
                          placeholder="Team name"
                          style={{ ...iS, flex: 1, fontWeight: 800, fontSize: 14, color: '#0f4c75', border: `1px solid ${team.color}66` }} />
                      ) : (
                        <span onClick={() => setEditingTeamId(team.id)} className="flex items-center gap-1"
                          style={{ flex: 1, fontWeight: 800, fontSize: 14, color: team.name.trim() ? '#0f4c75' : '#94a3b8', cursor: 'text' }}>
                          {team.name.trim() || 'Team name'} <span style={{ opacity: 0.6, fontSize: 10 }} title="Rename">✏️</span>
                        </span>
                      )}
                      <button onClick={() => removeTeamCard(team.id)} disabled={teams.length <= 1}
                        style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: teams.length <= 1 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.08)', color: teams.length <= 1 ? '#94a3b8' : '#dc2626', border: '1px solid rgba(220,38,38,0.15)', flexShrink: 0 }}>×</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${team.players.length}, 1fr)`, gap: 8 }}>
                      {team.players.map((slot, sIdx) => (
                        <div key={slot.id}>
                          <div className="flex items-center gap-2 mb-1">
                            <GenderToggle value={slot.gender} onChange={g => updateSlot(team.id, sIdx, { gender: g })} />
                            <span className="text-xs font-bold text-slate-500">Player {sIdx + 1}</span>
                          </div>
                          <PlayerNameField name={slot.name} duprId={slot.duprId} nickname={slot.nickname} knownPlayers={knownPlayers}
                            onChange={val => updateSlot(team.id, sIdx, { name: val.name, duprId: val.duprId, nickname: val.nickname ?? slot.nickname })}
                            inputStyle={{ ...iS, width: '100%', fontSize: 12 }} />
                        </div>
                      ))}
                    </div>
                    {format === 'trio' && trioFilledTeams.includes(team) && !trioGenderOk(team) && (
                      <p className="text-amber-600 text-xs">⚠ This format needs exactly 2 male + 1 female player on each team.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={addTeamCard} className="mt-3 w-full py-2 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px dashed rgba(15,76,117,0.3)', cursor: 'pointer' }}>
              + Add team
            </button>
            <p className="text-slate-600 text-xs mt-2 font-bold">
              {format === 'trio' ? `${trioReadyTeams.length} complete team${trioReadyTeams.length !== 1 ? 's' : ''}` : `${allTeamIds.length} complete team${allTeamIds.length !== 1 ? 's' : ''}`}
              {format === 'trio' && trioBadGenderCount > 0 ? ` · ${trioBadGenderCount} need${trioBadGenderCount === 1 ? 's' : ''} a 2M/1F gender split` : ''}
            </p>
          </div>
        )}

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
                style={{ ...iS, width: 64, textAlign: 'center', fontSize: 14, background: 'rgba(255,255,255,0.7)', color: '#1e293b', border: '1px solid rgba(0,0,0,0.15)' }} />
              <span className="text-slate-600 text-sm">minutes per round</span>
            </div>
          )}
        </div>

        {(format === 'singles' || format === 'fixedpartner') && startMode === 'swiss' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-bold text-slate-700">Each team plays</p>
              <span className="text-xs text-slate-400">optional</span>
            </div>
            {validCounts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {validCounts.map(n => {
                  const sel = selectedGames === n;
                  const rounds = roundsForGames(allTeamIds.length, courts.length, n);
                  return (
                    <button key={n} onClick={() => setNumGames(sel ? 0 : n)}
                      title={`${rounds} round${rounds !== 1 ? 's' : ''}`}
                      style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: sel ? 'rgba(15,76,117,0.18)' : 'rgba(0,0,0,0.05)', color: sel ? '#0f4c75' : '#64748b', border: '2px solid ' + (sel ? 'rgba(15,76,117,0.5)' : 'rgba(0,0,0,0.1)') }}>
                      {n} game{n !== 1 ? 's' : ''}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">Select teams and courts to see options.</p>
            )}
          </div>
        )}

        {(format === 'singles' || format === 'fixedpartner') && startMode === 'swiss' && (
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
            {courts.length} court{courts.length !== 1 ? 's' : ''} → {effectiveCourts * 2} play, {Math.max(0, allTeamIds.length - effectiveCourts * 2)} bye per round{parsedRounds > 0 ? ' · ' + parsedRounds + ' round' + (parsedRounds !== 1 ? 's' : '') : ''}{timerEnabled ? ' · ' + timerMins + ' min rounds' : ''}.<br />
            No back-to-back byes. Bye partnerships rotate.
          </div>
        )}

        {(format === 'singles' || format === 'fixedpartner') && startMode === 'roundrobin' && (
          rrPreviewSchedule.length > 0 ? (
            <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
              {allTeamIds.length} team{allTeamIds.length !== 1 ? 's' : ''} · {rrPreviewSchedule.length} round{rrPreviewSchedule.length !== 1 ? 's' : ''} · {rrPreviewSchedule.reduce((a, r) => a + r.length, 0)} total matches · everyone plays everyone once{timerEnabled ? ` · ${timerMins} min rounds` : ''}.<br />
              The full schedule is generated up front — the tournament opens directly in Round Robin mode.
            </div>
          ) : (
            <p className="text-slate-400 text-xs">Add teams and courts to see the round robin schedule preview.</p>
          )
        )}

        {format === 'trio' && trioReadyTeams.length >= 2 && (
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
            🔁 Round Robin · {trioReadyTeams.length} teams · {trioTotalRounds} round{trioTotalRounds !== 1 ? 's' : ''} (every team plays every other team once) · {trioMinCourts} court{trioMinCourts !== 1 ? 's' : ''} needed · {trioTotalGames} total games{timerEnabled ? ` · ${timerMins} min rounds` : ''}.<br />
            The full schedule is generated up front — there is no Swiss phase for Trio.
          </div>
        )}

        {format === 'doublesrr' && doublesRRNamedPlayers.length > 0 && (
          doublesRRCountValid ? (
            doublesRRPreviewSchedule.length > 0 ? (
              <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.08)', color: '#475569' }}>
                🔁 Round Robin · {doublesRRNamedPlayers.length} players · {doublesRRPreviewSchedule.length} round{doublesRRPreviewSchedule.length !== 1 ? 's' : ''} · everyone partners with everyone exactly once{timerEnabled ? ` · ${timerMins} min rounds` : ''}
              </div>
            ) : (
              <p className="text-slate-400 text-xs">Add courts to see the doubles round robin schedule preview.</p>
            )
          ) : (
            <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', color: '#92400e' }}>
              Doubles RR needs a player count where every round can split into complete 2v2 courts (N mod 4 is 0 or 1).
              You have {doublesRRNamedPlayers.length} — try {[doublesRRSuggestion?.lower, doublesRRSuggestion?.upper].filter(Boolean).join(' or ')}.
            </div>
          )
        )}

        {!canStart && (
          <p className="text-amber-600 text-xs text-center">
            {format === 'trio'
              ? (trioReadyTeams.length < 2 ? 'Need at least 2 complete teams.' : `Need at least ${trioMinCourts} court${trioMinCourts !== 1 ? 's' : ''}.`)
              : format === 'doublesrr'
              ? (!doublesRRCountValid ? 'Player count is unsupported — see above.' : courts.length < 1 ? 'Need at least 1 court.' : '')
              : (allTeamIds.length < 3 ? 'Need at least 3 teams.' : courts.length < 1 ? 'Need at least 1 court.' : '')}
          </p>
        )}

        <button onClick={handleStart} disabled={!canStart} className="w-full py-3 rounded-xl font-bold text-base btn-blue">
          Start Tournament 🚀
        </button>
      </div>
      )}
    </div>
  );
}
