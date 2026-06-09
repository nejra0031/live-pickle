import { useState } from 'react';
import { hasPermission } from '../roleConfig';
import { ALL_TEAMS } from '../constants';
import TiebreakOrderEditor from '../components/TiebreakOrderEditor';
import PlayerNameField from '../components/PlayerNameField';
import useKnownPlayers from '../hooks/useKnownPlayers';
import { useTeamById } from '../context/TeamRegistryContext';

const iS = { padding: '8px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };
const fS = { flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none' };

const DISPLAY_MODE_OPTIONS = [
  { value: 'name', label: 'Team name' },
  { value: 'players', label: 'Player names' },
  { value: 'both', label: 'Both' },
];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parseDT(v) {
  if (!v) return { date: '', hour: 8, min: 0 };
  const [date, time = ''] = v.split('T');
  const [h, m] = time.split(':').map(Number);
  return { date, hour: isNaN(h) ? 8 : h, min: Math.round((isNaN(m) ? 0 : m) / 5) * 5 % 60 };
}

function Acc({ title, open, onToggle, children, danger }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#fca5a5' : '#e2e8f0', fontSize: 15, fontWeight: 800, textAlign: 'left', gap: 8 }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 13, color: open ? '#818cf8' : '#475569', flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div style={{ padding: '0 20px 18px' }}>{children}</div>}
    </div>
  );
}

function FL({ children }) {
  return <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4, marginTop: 0 }}>{children}</p>;
}

const selS = { ...iS, width: 'auto', background: '#1e293b' };

function StartTimePicker({ startTime, setStartTime }) {
  const { date, hour, min } = parseDT(startTime);
  const setDT = (d, h, m) => setStartTime(d ? `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : '');
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="date" value={date}
        onChange={e => setDT(e.target.value, hour, min)}
        onClick={e => e.currentTarget.showPicker?.()}
        onWheel={e => e.currentTarget.blur()}
        style={{ ...iS, flex: '1 1 auto', minWidth: 110, background: '#1e293b' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select value={hour} onChange={e => setDT(date, Number(e.target.value), min)} style={selS}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h} style={{ background: '#1e293b' }}>{String(h).padStart(2, '0')}</option>)}
        </select>
        <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 15 }}>:</span>
        <select value={min} onChange={e => setDT(date, hour, Number(e.target.value))} style={selS}>
          {MINUTES.map(m => <option key={m} value={m} style={{ background: '#1e293b' }}>{String(m).padStart(2, '0')}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function TournamentSettingsModal({
  role,
  tournamentTitle, tournamentLocation, tournamentStartTime, tournamentDurationMins,
  tournamentMode,
  standingsTiebreakOrder, onStandingsTiebreakOrderChange,
  doublesRRTiebreakOrder, onDoublesRRTiebreakOrderChange,
  activeTeamIds, tournamentTeams, pausedIds, onTogglePause, teamNameDisplay, onTeamNameDisplayChange,
  tptTeams, tptPlayers,
  doublesRRPlayers,
  courtNumbers, socialCourts, roundRobinCourts,
  onSaveInfo, onManageTeamsSave, onManageTPTTeamsSave, onManageDoublesRRPlayersSave, onManageCourtsSave,
  onReset,
  onClose,
}) {
  const canEditEventInfo = hasPermission(role, 'canEditEventInfo');
  const canEditStandingsOrder = hasPermission(role, 'canEditStandingsOrder');
  const canPauseTeams = hasPermission(role, 'canPauseTeams');
  const canEditTeams = hasPermission(role, 'canEditTeams');
  const canEditCourts = hasPermission(role, 'canEditCourts');
  const canResetTournament = hasPermission(role, 'canResetTournament');

  const [sec, setSec] = useState({});
  const toggle = k => setSec(p => ({ ...p, [k]: !p[k] }));

  // Event info state
  const [title, setTitle] = useState(tournamentTitle || '');
  const [location, setLocation] = useState(tournamentLocation || '');
  const [startTime, setStartTime] = useState(tournamentStartTime || '');
  const [durationMins, setDurationMins] = useState(tournamentDurationMins || 0);

  // Teams state — swiss / rr
  const teamById = useTeamById();
  const emptyPair = () => [{ name: '', duprId: '' }, { name: '', duprId: '' }];
  const [localTeams, setLocalTeams] = useState(() =>
    (activeTeamIds || []).map(id => {
      const t = teamById(id);
      const players = t?.players?.length === 2 ? t.players.map(p => ({ name: p.name || '', duprId: p.duprId || '' })) : emptyPair();
      return { id, name: t?.name ?? id, color: t?.color ?? '#475569', text: t?.text ?? '#fff', players };
    })
  );
  const [addId, setAddId] = useState('');
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  // Teams state — TPT
  const [localTPTTeams, setLocalTPTTeams] = useState(() =>
    tptTeams ? Object.values(tptTeams).map(t => ({ ...t })) : []
  );
  const [localTPTPlayers, setLocalTPTPlayers] = useState(() =>
    tptPlayers ? Object.fromEntries(Object.entries(tptPlayers).map(([id, p]) => [id, { duprId: '', nickname: '', ...p }])) : {}
  );

  // Teams state — DoublesRR
  const [localDRRPlayers, setLocalDRRPlayers] = useState(() =>
    doublesRRPlayers ? Object.fromEntries(Object.entries(doublesRRPlayers).map(([id, p]) => [id, { duprId: '', nickname: '', ...p }])) : {}
  );

  // Courts state
  const [localCourts, setLocalCourts] = useState(() => (courtNumbers || []).map(c => String(c)));
  const [localSocial, setLocalSocial] = useState(() => (courtNumbers || []).map(c => (socialCourts || []).includes(String(c))));

  // Reset confirmation state
  const [resetConfirm, setResetConfirm] = useState(false);

  // Derived
  const usedIds = new Set(localTeams.map(t => t.id));
  const available = ALL_TEAMS.filter(t => !usedIds.has(t.id));
  const courtsValid = localCourts.length >= 1 && localCourts.every(v => v.trim() !== '') && new Set(localCourts.map(v => v.trim())).size === localCourts.length;
  const rrCourtCount = tournamentMode === 'roundrobin' ? (roundRobinCourts?.length ?? 0) : 0;
  const rrWarning = rrCourtCount > 0 && localCourts.filter((_, i) => !localSocial[i]).length < rrCourtCount;

  const handleSave = () => {
    if (canEditEventInfo) onSaveInfo({ title, location, startTime, durationMins });
    if (canEditTeams) {
      if (tournamentMode === 'tpt' && onManageTPTTeamsSave) {
        const newTeams = Object.fromEntries(localTPTTeams.map(t => [t.id, { ...t, name: t.name.trim() || t.id }]));
        const newPlayers = Object.fromEntries(
          Object.entries(localTPTPlayers).map(([id, p]) => [id, { ...p, name: p.name.trim() || id, duprId: (p.duprId || '').trim(), nickname: (p.nickname || '').trim() }])
        );
        Object.values(newPlayers).forEach(p => saveKnownPlayer(p.name, p.duprId, p.nickname));
        onManageTPTTeamsSave(newTeams, newPlayers);
      } else if (tournamentMode === 'doublesrr' && onManageDoublesRRPlayersSave) {
        const newPlayers = Object.fromEntries(
          Object.entries(localDRRPlayers).map(([id, p]) => [id, { ...p, name: p.name.trim() || id, duprId: (p.duprId || '').trim(), nickname: (p.nickname || '').trim() }])
        );
        Object.values(newPlayers).forEach(p => saveKnownPlayer(p.name, p.duprId, p.nickname));
        onManageDoublesRRPlayersSave(newPlayers);
      } else if (onManageTeamsSave) {
        const registry = localTeams.map(t => {
          const orig = (tournamentTeams || []).find(x => x.id === t.id);
          const players = t.players.map(p => ({ name: p.name.trim(), duprId: p.duprId.trim() }));
          const hasPlayers = players.some(p => p.name);
          players.filter(p => p.name).forEach(p => saveKnownPlayer(p.name, p.duprId));
          return { id: t.id, name: t.name.trim() || t.id, color: orig?.color ?? t.color, text: orig?.text ?? t.text, ...(hasPlayers ? { players } : {}) };
        });
        onManageTeamsSave(registry, localTeams.map(t => t.id));
      }
    }
    if (canEditCourts && courtsValid && onManageCourtsSave) {
      const trimmed = localCourts.map(v => v.trim());
      onManageCourtsSave(trimmed, trimmed.filter((_, i) => localSocial[i]));
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl w-full max-w-sm flex flex-col modal-box" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>

        {/* Title */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Tournament Settings</span>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {/* ── Event info ── */}
          {canEditEventInfo && (
            <Acc title="Event info" open={sec.info} onToggle={() => toggle('info')}>
              <div className="flex flex-col gap-3">
                <div><FL>Tournament name</FL>
                  <input value={title} onChange={e => setTitle(e.target.value)} style={iS} placeholder="Tournament" />
                </div>
                <div><FL>Location</FL>
                  <input value={location} onChange={e => setLocation(e.target.value)} style={iS} placeholder="e.g. Lakeside Courts" />
                </div>
                <div><FL>Start date &amp; time</FL>
                  <StartTimePicker startTime={startTime} setStartTime={setStartTime} />
                </div>
                <div><FL>Duration</FL>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={999} value={durationMins || ''} placeholder="0"
                      onChange={e => setDurationMins(Math.max(0, Number(e.target.value) || 0))}
                      style={{ ...iS, width: 80, textAlign: 'center' }} />
                    <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>minutes</span>
                  </div>
                </div>
              </div>
            </Acc>
          )}

          {/* ── Standings order ── */}
          {canEditStandingsOrder && tournamentMode !== null && (
            <Acc title="Standings order" open={sec.standings} onToggle={() => toggle('standings')}>
              <div className="rounded-xl" style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <TiebreakOrderEditor
                  order={tournamentMode === 'doublesrr' ? doublesRRTiebreakOrder : standingsTiebreakOrder}
                  onChange={tournamentMode === 'doublesrr' ? onDoublesRRTiebreakOrderChange : onStandingsTiebreakOrderChange}
                  dark
                />
              </div>
            </Acc>
          )}

          {/* ── Team status ── */}
          {canPauseTeams && tournamentMode !== 'tpt' && tournamentMode !== 'doublesrr' && onTogglePause && (
            <Acc title="Team status" open={sec.teamStatus} onToggle={() => toggle('teamStatus')}>
              <div className="flex flex-wrap" style={{ gap: 8 }}>
                {(activeTeamIds || []).map(id => {
                  const t = teamById(id);
                  const paused = (pausedIds || []).includes(id);
                  return (
                    <button key={id} onClick={() => onTogglePause(id)} className="rounded-full font-bold"
                      style={{ padding: '5px 12px', fontSize: 13, background: paused ? 'rgba(0,0,0,0.05)' : t.color, color: paused ? '#94a3b8' : t.text, border: `2px solid ${paused ? 'rgba(0,0,0,0.08)' : t.color}`, cursor: 'pointer', opacity: paused ? 0.6 : 1, textDecoration: paused ? 'line-through' : 'none' }}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
              {(pausedIds || []).length > 0 && (
                <p style={{ fontSize: 12, color: '#d97706', marginTop: 8 }}>
                  {(pausedIds || []).map(id => teamById(id)?.name).filter(Boolean).join(', ')} paused — excluded from rotation.
                </p>
              )}
            </Acc>
          )}

          {/* ── Teams & players — swiss / rr ── */}
          {canEditTeams && tournamentMode !== 'tpt' && tournamentMode !== 'doublesrr' && (
            <Acc title="Teams & players" open={sec.teams} onToggle={() => toggle('teams')}>

              {onTeamNameDisplayChange && (
                <div style={{ marginBottom: 16 }}>
                  <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Chip display</p>
                  <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {DISPLAY_MODE_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => onTeamNameDisplayChange(opt.value)}
                        style={{ flex: 1, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: teamNameDisplay === opt.value ? 'rgba(99,102,241,0.3)' : 'transparent', color: teamNameDisplay === opt.value ? '#a5b4fc' : '#94a3b8', border: teamNameDisplay === opt.value ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Rename</p>
                <div className="flex flex-col gap-2">
                  {localTeams.map(t => {
                    const filled = t.players.filter(p => p.name.trim()).length;
                    return (
                      <div key={t.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                          <input value={t.name} onChange={e => setLocalTeams(p => p.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} style={fS} />
                          <button onClick={() => setExpandedPlayerId(p => p === t.id ? null : t.id)} title="Edit players"
                            style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, background: filled > 0 ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.06)', color: filled > 0 ? '#a5b4fc' : '#94a3b8', border: '1px solid rgba(99,102,241,0.25)' }}>
                            {expandedPlayerId === t.id ? '▲' : '▼'} 👤{filled > 0 ? ` ${filled}/2` : ''}
                          </button>
                          <button onClick={() => setLocalTeams(p => p.filter(x => x.id !== t.id))} disabled={localTeams.length <= 2}
                            style={{ padding: '3px 7px', borderRadius: 6, fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: localTeams.length <= 2 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.12)', color: localTeams.length <= 2 ? '#475569' : '#f87171', border: '1px solid rgba(220,38,38,0.25)' }}>×</button>
                        </div>
                        {expandedPlayerId === t.id && (
                          <div className="rounded-lg p-2 flex flex-col gap-2" style={{ marginLeft: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Players (for DUPR export)</p>
                            {t.players.map((pl, slot) => (
                              <PlayerNameField key={slot} name={pl.name} duprId={pl.duprId} knownPlayers={knownPlayers}
                                onChange={val => setLocalTeams(p => p.map(x => {
                                  if (x.id !== t.id) return x;
                                  const players = [...x.players]; players[slot] = val; return { ...x, players };
                                }))}
                                placeholder={`Player ${slot + 1}`} inputStyle={fS} duprIdStyle={{ ...fS, fontSize: 11 }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {available.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Add a team</p>
                    <div className="flex gap-2">
                      <select value={addId} onChange={e => setAddId(e.target.value)} style={{ flex: 1, ...fS }}>
                        <option value="">— choose colour —</option>
                        {available.map(t => <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>)}
                      </select>
                      <button onClick={() => {
                        const base = ALL_TEAMS.find(t => t.id === addId); if (!base) return;
                        setLocalTeams(p => [...p, { id: base.id, name: base.name, color: base.color, text: base.text, players: emptyPair() }]);
                        setAddId('');
                      }} disabled={!addId}
                        style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, flexShrink: 0, cursor: addId ? 'pointer' : 'not-allowed', background: addId ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', color: addId ? '#a5b4fc' : '#475569', border: '1px solid rgba(99,102,241,0.3)' }}>
                        + Add
                      </button>
                    </div>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>New teams start with 0 wins and join immediately.</p>
                  </div>
                )}
              </div>
            </Acc>
          )}

          {/* ── Teams & players — TPT ── */}
          {canEditTeams && tournamentMode === 'tpt' && (
            <Acc title="Teams & players" open={sec.teams} onToggle={() => toggle('teams')}>
              <div className="flex flex-col gap-4">
                {localTPTTeams.map(team => {
                  const players = [...(team.maleIds || []), team.femaleId].filter(Boolean).map(pid => localTPTPlayers[pid]).filter(Boolean);
                  return (
                    <div key={team.id} className="rounded-xl p-3 flex flex-col gap-2" style={{ border: `1px solid ${team.color}44`, background: `${team.color}18` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: team.color }} />
                        <input value={team.name} onChange={e => setLocalTPTTeams(p => p.map(t => t.id === team.id ? { ...t, name: e.target.value } : t))}
                          style={{ ...fS, fontWeight: 800, color: team.color }} />
                      </div>
                      {players.map(p => (
                        <div key={p.id} className="flex items-start gap-2">
                          <span style={{ fontSize: 11, color: p.gender === 'female' ? '#f9a8d4' : '#93c5fd', fontWeight: 700, width: 14, flexShrink: 0, marginTop: 8 }}>
                            {p.gender === 'female' ? '♀' : '♂'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <PlayerNameField name={p.name} duprId={p.duprId || ''} nickname={p.nickname || ''} knownPlayers={knownPlayers}
                              onChange={val => setLocalTPTPlayers(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: val.name, duprId: val.duprId, nickname: val.nickname ?? prev[p.id].nickname } }))}
                              inputStyle={fS} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Acc>
          )}

          {/* ── Players — DoublesRR ── */}
          {canEditTeams && tournamentMode === 'doublesrr' && (
            <Acc title="Players" open={sec.teams} onToggle={() => toggle('teams')}>
              <div className="flex flex-col gap-3">
                {Object.values(localDRRPlayers).map(p => (
                  <div key={p.id} className="rounded-xl p-3 flex items-center gap-2" style={{ border: `1px solid ${p.color || '#64748b'}44`, background: `${p.color || '#64748b'}18` }}>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color || '#64748b' }} />
                    <div style={{ flex: 1 }}>
                      <PlayerNameField name={p.name} duprId={p.duprId || ''} nickname={p.nickname || ''} knownPlayers={knownPlayers}
                        onChange={val => setLocalDRRPlayers(prev => ({ ...prev, [p.id]: { ...prev[p.id], name: val.name, duprId: val.duprId, nickname: val.nickname ?? prev[p.id].nickname } }))}
                        inputStyle={fS} />
                    </div>
                  </div>
                ))}
              </div>
            </Acc>
          )}

          {/* ── Courts ── */}
          {canEditCourts && (
            <Acc title="Courts" open={sec.courts} onToggle={() => toggle('courts')}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Rename, add, or remove courts. Social courts are excluded from round generation.</p>
              {rrWarning && (
                <div className="notice-amber" style={{ marginBottom: 12 }}>
                  ⚠️ Round Robin is active with {rrCourtCount} court{rrCourtCount !== 1 ? 's' : ''} — reducing competitive courts below that may break the schedule.
                </div>
              )}
              <div className="flex flex-col gap-2">
                {localCourts.map((c, i) => {
                  const dup = localCourts.filter((_, j) => j !== i).map(v => v.trim()).includes(c.trim());
                  const invalid = c.trim() === '' || dup;
                  const isSocial = localSocial[i];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                      <input value={c} onChange={e => setLocalCourts(p => p.map((x, j) => j === i ? e.target.value : x))}
                        style={{ flex: 1, ...fS, border: `1px solid ${invalid ? '#ef4444' : 'rgba(255,255,255,0.15)'}` }} />
                      <button onClick={() => setLocalSocial(p => p.map((v, j) => j === i ? !v : v))} title={isSocial ? 'Mark as competitive' : 'Mark as social'}
                        style={{ flexShrink: 0, width: 52, padding: '4px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: isSocial ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)', color: isSocial ? '#a5b4fc' : '#64748b', border: `1px solid ${isSocial ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}` }}>Social</button>
                      <button onClick={() => { setLocalCourts(p => p.filter((_, j) => j !== i)); setLocalSocial(p => p.filter((_, j) => j !== i)); }}
                        disabled={localCourts.length <= 1}
                        style={{ padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700, flexShrink: 0, cursor: localCourts.length <= 1 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.15)', color: localCourts.length <= 1 ? '#475569' : '#f87171', border: '1px solid rgba(220,38,38,0.3)' }}>×</button>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => {
                const existing = new Set(localCourts.map(v => v.trim()));
                let n = localCourts.length + 1; while (existing.has(String(n))) n++;
                setLocalCourts(p => [...p, String(n)]); setLocalSocial(p => [...p, false]);
              }} style={{ marginTop: 10, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                + Add court
              </button>
              {!courtsValid && <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 6 }}>Court names must be unique and non-empty.</p>}
            </Acc>
          )}

          {/* ── Reset ── */}
          {canResetTournament && (
            <Acc title="Reset tournament" open={sec.reset} onToggle={() => toggle('reset')} danger>
              {!resetConfirm ? (
                <>
                  <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>Ends the current tournament and resets all match data. Teams and courts are preserved.</p>
                  <button onClick={() => setResetConfirm(true)}
                    style={{ padding: '8px 16px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)' }}>
                    Reset tournament…
                  </button>
                </>
              ) : (
                <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)' }}>
                  <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 700, margin: 0 }}>Are you sure? All match history will be lost. This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setResetConfirm(false)}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Cancel
                    </button>
                    <button onClick={onReset}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: 'rgba(220,38,38,0.25)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.4)' }}>
                      Confirm reset
                    </button>
                  </div>
                </div>
              )}
            </Acc>
          )}

        </div>

        {/* Fixed footer */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', flexShrink: 0 }}>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
            <button onClick={handleSave} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
          </div>
        </div>

      </div>
    </div>
  );
}
