import { useState, useMemo } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';
import useKnownPlayers from '../hooks/useKnownPlayers';
import PlayerNameField from '../components/PlayerNameField';
import {
  buildDUPRRows, buildDUPRCsv, downloadCsv, playerNeedsInfo,
  collectTPTPlayerIds, collectDoublesRRPlayerIds, collectSwissTeamIds, BLANK_PLAYER,
} from '../algorithms/duprExport';

const todayStr = () => new Date().toISOString().slice(0, 10);

const iS = { padding: '8px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };
const fieldS = { padding: '6px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };

export default function ExportDUPRModal({ history, tournamentMode, tptTeams, tptPlayers, tptSubstitutions = {}, doublesRRPlayers = {}, tournamentTitle, tournamentLocation, onClose }) {
  const teamById = useTeamById();
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();
  const [eventName, setEventName] = useState(tournamentTitle || 'Tournament');
  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState(tournamentLocation || '');
  const [scoreType, setScoreType] = useState(''); // no default — admin must choose SIDEOUT or RALLY

  // Players/teams that appear in the export but are missing a name or DUPR ID —
  // offered up for editing here so the export doesn't have to be blocked or re-run.
  const [tptOverrides, setTptOverrides] = useState({});     // playerId -> { name, duprId }
  const [doublesRROverrides, setDoublesRROverrides] = useState({}); // playerId -> { name, duprId }
  const [swissOverrides, setSwissOverrides] = useState({}); // teamId -> [{name,duprId},{name,duprId}]

  const incompleteTPTPlayers = useMemo(() => {
    if (tournamentMode !== 'tpt') return [];
    return collectTPTPlayerIds({ history, tptTeams, tptSubstitutions })
      .map(id => tptPlayers[id])
      .filter(p => p && playerNeedsInfo(p));
  }, [tournamentMode, history, tptTeams, tptPlayers, tptSubstitutions]);

  const incompleteDoublesRRPlayers = useMemo(() => {
    if (tournamentMode !== 'doublesrr') return [];
    return collectDoublesRRPlayerIds({ history })
      .map(id => doublesRRPlayers[id])
      .filter(p => p && playerNeedsInfo(p));
  }, [tournamentMode, history, doublesRRPlayers]);

  const incompleteSwissTeams = useMemo(() => {
    if (tournamentMode === 'tpt') return [];
    return collectSwissTeamIds({ history })
      .map(id => teamById(id))
      .filter(t => t && (t.players?.length !== 2 || t.players.some(playerNeedsInfo)));
  }, [tournamentMode, history, teamById]);

  const updateTptOverride = (player, val) => setTptOverrides(prev => ({ ...prev, [player.id]: val }));
  const updateDoublesRROverride = (player, val) => setDoublesRROverrides(prev => ({ ...prev, [player.id]: val }));
  const updateSwissOverride = (team, idx, val) => setSwissOverrides(prev => {
    const current = prev[team.id] || team.players || [BLANK_PLAYER, BLANK_PLAYER];
    const next = [...current];
    next[idx] = val;
    return { ...prev, [team.id]: next };
  });

  const effectiveTptPlayers = useMemo(() => {
    if (Object.keys(tptOverrides).length === 0) return tptPlayers;
    const merged = { ...tptPlayers };
    for (const [id, ov] of Object.entries(tptOverrides)) merged[id] = { ...merged[id], ...ov };
    return merged;
  }, [tptPlayers, tptOverrides]);

  const effectiveDoublesRRPlayers = useMemo(() => {
    if (Object.keys(doublesRROverrides).length === 0) return doublesRRPlayers;
    const merged = { ...doublesRRPlayers };
    for (const [id, ov] of Object.entries(doublesRROverrides)) merged[id] = { ...merged[id], ...ov };
    return merged;
  }, [doublesRRPlayers, doublesRROverrides]);

  const effectiveTeamById = useMemo(() => {
    if (Object.keys(swissOverrides).length === 0) return teamById;
    return id => {
      const t = teamById(id);
      return (t && swissOverrides[t.id]) ? { ...t, players: swissOverrides[t.id] } : t;
    };
  }, [teamById, swissOverrides]);

  const rows = useMemo(
    () => buildDUPRRows({
      history, tournamentMode, tptTeams, tptPlayers: effectiveTptPlayers, tptSubstitutions,
      doublesRRPlayers: effectiveDoublesRRPlayers, teamById: effectiveTeamById,
    }),
    [history, tournamentMode, tptTeams, effectiveTptPlayers, tptSubstitutions, effectiveDoublesRRPlayers, effectiveTeamById]
  );

  // DUPR requires a name + DUPR ID for every player in a doubles match — rows
  // missing any of those will likely be rejected by DUPR's importer even though
  // we still include them in the download.
  const incompleteRowCount = useMemo(() => rows.filter(r =>
    !r.playerA1?.trim() || !r.playerA1DuprId?.trim() || !r.playerA2?.trim() || !r.playerA2DuprId?.trim() ||
    !r.playerB1?.trim() || !r.playerB1DuprId?.trim() || !r.playerB2?.trim() || !r.playerB2DuprId?.trim()
  ).length, [rows]);

  const canExport = rows.length > 0 && !!scoreType;

  const doExport = () => {
    if (!canExport) return;
    Object.entries(tptOverrides).forEach(([id, ov]) => saveKnownPlayer(ov.name ?? tptPlayers[id]?.name, ov.duprId));
    Object.entries(doublesRROverrides).forEach(([id, ov]) => saveKnownPlayer(ov.name ?? doublesRRPlayers[id]?.name, ov.duprId));
    Object.values(swissOverrides).forEach(pair => pair.forEach(p => { if (p?.name?.trim()) saveKnownPlayer(p.name, p.duprId); }));
    const csv = buildDUPRCsv(rows, { eventName: eventName.trim() || 'Tournament', date, location: location.trim(), scoreType });
    downloadCsv(`dupr_export_${date}.csv`, csv);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 modal-box" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">📤 Export to DUPR</div>

        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Event name</p>
          <input value={eventName} onChange={e => setEventName(e.target.value)} style={iS} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iS} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Location</p>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Madison Square Garden, New York, NY" style={iS} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Score type</p>
          <div className="flex gap-2">
            {[['SIDEOUT', 'Sideout'], ['RALLY', 'Rally']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setScoreType(val)}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={scoreType === val
                  ? { background: 'rgba(99,102,241,0.9)', color: '#fff', border: '1px solid rgba(99,102,241,0.9)' }
                  : { background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.15)' }}>
                {label}
              </button>
            ))}
          </div>
          {!scoreType && <p className="text-xs mt-1" style={{ color: '#fb923c' }}>Choose how these games were scored.</p>}
        </div>

        {(incompleteTPTPlayers.length > 0 || incompleteDoublesRRPlayers.length > 0 || incompleteSwissTeams.length > 0) && (
          <div className="rounded-xl p-3 flex flex-col gap-3" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
            <p className="text-xs font-bold" style={{ color: '#fb923c' }}>
              Some players are missing a name or DUPR ID. Fill them in below, or leave blank — the export will still include those games with blank fields.
            </p>

            {incompleteTPTPlayers.map(p => {
              const ov = tptOverrides[p.id] || p;
              const displayHint = p.nickname && p.nickname !== p.name ? ` (${p.nickname})` : '';
              return (
                <div key={p.id} className="flex flex-col gap-1">
                  <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>
                    {p.name || p.nickname || '(unnamed player)'}{displayHint && !p.name ? ` · nickname: ${p.nickname}` : ''}
                  </span>
                  <div className="flex gap-2">
                    <input value={ov.name ?? p.name ?? ''} placeholder="Full legal name" style={{ ...fieldS, flex: 1 }}
                      onChange={e => updateTptOverride(p, { name: e.target.value, duprId: ov.duprId ?? p.duprId ?? '' })} />
                    <input value={ov.duprId ?? p.duprId ?? ''} placeholder="DUPR ID" style={{ ...fieldS, width: 110 }}
                      onChange={e => updateTptOverride(p, { name: ov.name ?? p.name ?? '', duprId: e.target.value })} />
                  </div>
                </div>
              );
            })}

            {incompleteDoublesRRPlayers.map(p => {
              const ov = doublesRROverrides[p.id] || p;
              return (
                <div key={p.id} className="flex flex-col gap-1">
                  <span className="text-xs font-bold" style={{ color: '#94a3b8' }}>
                    {p.name || p.nickname || '(unnamed player)'}{!p.name && p.nickname ? ` · nickname: ${p.nickname}` : ''}
                  </span>
                  <div className="flex gap-2">
                    <input value={ov.name ?? p.name ?? ''} placeholder="Full legal name" style={{ ...fieldS, flex: 1 }}
                      onChange={e => updateDoublesRROverride(p, { name: e.target.value, duprId: ov.duprId ?? p.duprId ?? '' })} />
                    <input value={ov.duprId ?? p.duprId ?? ''} placeholder="DUPR ID" style={{ ...fieldS, width: 110 }}
                      onChange={e => updateDoublesRROverride(p, { name: ov.name ?? p.name ?? '', duprId: e.target.value })} />
                  </div>
                </div>
              );
            })}

            {incompleteSwissTeams.map(t => {
              const pair = swissOverrides[t.id] || t.players || [BLANK_PLAYER, BLANK_PLAYER];
              return (
                <div key={t.id} className="flex flex-col gap-1">
                  <span className="text-xs font-bold" style={{ color: '#e2e8f0' }}>{t.name}</span>
                  {[0, 1].map(idx => (
                    <PlayerNameField key={idx} name={pair[idx]?.name || ''} duprId={pair[idx]?.duprId || ''} knownPlayers={knownPlayers}
                      onChange={val => updateSwissOverride(t, idx, val)} placeholder={`Player ${idx + 1} name`}
                      inputStyle={fieldS} />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <p className="text-xs" style={{ color: rows.length > 0 ? '#a5b4fc' : '#fb923c' }}>
            {rows.length} game{rows.length !== 1 ? 's' : ''} ready to export
          </p>
          {incompleteRowCount > 0 && (
            <p className="text-xs font-bold" style={{ color: '#f87171' }}>
              ⚠ {incompleteRowCount} of {rows.length} {incompleteRowCount === 1 ? 'game is' : 'games are'} missing a player name or DUPR ID and may be rejected by DUPR's importer.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={doExport} disabled={!canExport} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
            style={!canExport ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
