import { useState } from 'react';
import { ROLES, hasPermission } from '../roleConfig';
import { ALL_TEAMS } from '../constants';
import TiebreakOrderEditor from '../components/TiebreakOrderEditor';
import PlayerNameField from '../components/PlayerNameField';
import ColorSwatchPicker from '../components/ColorSwatchPicker';
import useKnownPlayers from '../hooks/useKnownPlayers';
import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';

const iS = {
  padding: '8px 10px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  background: '#fff',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
  outline: 'none',
  width: '100%',
};
const fS = {
  flex: 1,
  padding: '6px 10px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  background: '#fff',
  border: '1px solid var(--border)',
  color: 'var(--ink)',
  outline: 'none',
};
const uid = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const playerKey = (n: string) => n.trim().toLowerCase();

const DISPLAY_MODE_OPTIONS = [
  { value: 'name', label: 'Team name' },
  { value: 'players', label: 'Player names' },
  { value: 'both', label: 'Both' },
];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parseDT(v: string) {
  if (!v) return { date: '', hour: 8, min: 0 };
  const [date, time = ''] = v.split('T');
  const [h, m] = time.split(':').map(Number);
  return { date, hour: isNaN(h) ? 8 : h, min: (Math.round((isNaN(m) ? 0 : m) / 5) * 5) % 60 };
}

function Acc({
  title,
  open,
  onToggle,
  children,
  danger,
}: {
  title: any;
  open: any;
  onToggle: any;
  children: any;
  danger?: any;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: danger ? 'var(--red)' : 'var(--ink)',
          fontSize: 15,
          fontWeight: 700,
          textAlign: 'left',
          gap: 8,
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 13, color: open ? 'var(--court)' : 'var(--muted)', flexShrink: 0 }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div style={{ padding: '0 20px 20px' }}>{children}</div>}
    </div>
  );
}

function FL({ children }: { children: any }) {
  return (
    <p className="modal-label" style={{ marginBottom: 4, marginTop: 0 }}>
      {children}
    </p>
  );
}

// Nickname + full-name editor — DUPR ID is set during setup and not editable
// from Tournament Settings.
function NicknameField({ name, nickname, onChange }: { name: string; nickname: string; onChange: (v: any) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <input
        value={nickname}
        placeholder={name || 'Nickname'}
        onChange={(e) => onChange({ nickname: e.target.value })}
        style={fS}
      />
      <input
        value={name || ''}
        placeholder="Full name"
        onChange={(e) => onChange({ name: e.target.value })}
        style={fS}
      />
    </div>
  );
}

function AddPinForm({ roleId, onAddPin, onAdded }: { roleId: string; onAddPin: (roleId: string, label: string, pin: string) => Promise<any>; onAdded: (label: string, pin: string) => void }) {
  const [label, setLabel] = useState('');
  const [pinDigits, setPinDigits] = useState('');
  const [saving, setSaving] = useState(false);
  const ready = label.trim() && pinDigits.trim() && !saving;

  const handleAdd = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      const id = await onAddPin(roleId, label.trim(), pinDigits.trim());
      if (id) onAdded?.(id, pinDigits.trim());
      setLabel('');
      setPinDigits('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex gap-2 items-start">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label / Name"
        style={fS}
      />
      <input
        value={pinDigits}
        onChange={(e) => setPinDigits(e.target.value.replace(/\D/g, ''))}
        placeholder="PIN"
        inputMode="numeric"
        style={{ width: 70, ...fS }}
      />
      <button
        onClick={handleAdd}
        disabled={!ready}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
          cursor: ready ? 'pointer' : 'not-allowed',
          background: ready ? 'var(--court)' : 'rgba(0,0,0,0.05)',
          color: ready ? '#fff' : 'var(--muted)',
          border: '1px solid var(--court-soft)',
        }}
      >
        + Add
      </button>
    </div>
  );
}

const selS = { ...iS, width: 'auto' };

function StartTimePicker({ startTime, setStartTime }: { startTime: string; setStartTime: (v: string) => void }) {
  const { date, hour, min } = parseDT(startTime);
  const setDT = (d: string, h: number, m: number) =>
    setStartTime(d ? `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : '');
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        type="date"
        value={date}
        onChange={(e) => setDT(e.target.value, hour, min)}
        onClick={(e) => e.currentTarget.showPicker?.()}
        onWheel={(e) => e.currentTarget.blur()}
        style={{ ...iS, flex: '1 1 auto', minWidth: 110 }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select
          value={hour}
          onChange={(e) => setDT(date, Number(e.target.value), min)}
          style={selS}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
        <span style={{ color: 'var(--muted)', fontWeight: 900, fontSize: 15 }}>:</span>
        <select
          value={min}
          onChange={(e) => setDT(date, hour, Number(e.target.value))}
          style={selS}
        >
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {String(m).padStart(2, '0')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function TournamentSettingsModal({
  role,
  tournamentTitle,
  tournamentLocation,
  tournamentStartTime,
  tournamentDurationMins,
  maxPlayers: maxPlayersProp,
  tournamentMode,
  standingsTiebreakOrder,
  onStandingsTiebreakOrderChange,
  doublesRRTiebreakOrder,
  onDoublesRRTiebreakOrderChange,
  activeTeamIds,
  pausedIds,
  onTogglePause,
  teamNameDisplay,
  onTeamNameDisplayChange,
  tptTeams,
  tptPlayers,
  doublesRRPlayers,
  history,
  courtNumbers,
  socialCourts,
  roundRobinCourts,
  onSaveInfo,
  onManageTeamsSave,
  onManageTPTTeamsSave,
  onManageDoublesRRPlayersSave,
  onManageCourtsSave,
  onReset,
  isOwner,
  pins,
  onAddPin,
  onRevokePin,
  onClose,
}: any) {
  const canEditEventInfo = hasPermission(role, 'canEditEventInfo');
  const canEditStandingsOrder = hasPermission(role, 'canEditStandingsOrder');
  const canPauseTeams = hasPermission(role, 'canPauseTeams');
  const canEditTeams = hasPermission(role, 'canEditTeams');
  const canEditCourts = hasPermission(role, 'canEditCourts');
  const canResetTournament = hasPermission(role, 'canResetTournament');

  const [sec, setSec] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setSec((p) => ({ ...p, [k]: !p[k] }));

  // PINs created during this modal session — shown next to their label as a
  // one-time confirmation, since only the hash is persisted (see CLAUDE.md).
  const [sessionPins, setSessionPins] = useState<Record<string, string>>({});

  // Event info state
  const [title, setTitle] = useState(tournamentTitle || '');
  const [location, setLocation] = useState(tournamentLocation || '');
  const [startTime, setStartTime] = useState(tournamentStartTime || '');
  const [durationMins, setDurationMins] = useState(tournamentDurationMins || 0);
  const [maxPlayers, setMaxPlayers] = useState(maxPlayersProp || 0);

  // Teams state — swiss / rr
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const emptyPair = () => [
    { name: '', duprId: '', nickname: '' },
    { name: '', duprId: '', nickname: '' },
  ];
  const [localTeams, setLocalTeams] = useState(() =>
    (activeTeamIds || []).map((id: any) => {
      const t = teamById(id);
      const players =
        t?.players?.length === 2
          ? t.players.map((p: any) => ({
              name: p.name || '',
              duprId: p.duprId || '',
              nickname: p.nickname || '',
            }))
          : emptyPair();
      return {
        id,
        name: t?.name ?? id,
        color: t?.color ?? '#475569',
        text: t?.text ?? '#fff',
        players,
      };
    })
  );
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  // Teams state — TPT
  const [localTPTTeams, setLocalTPTTeams] = useState(() =>
    tptTeams ? Object.values(tptTeams).map((t: any) => ({ ...t })) : []
  );
  const [localTPTPlayers, setLocalTPTPlayers] = useState(() =>
    tptPlayers
      ? Object.fromEntries(
          Object.entries(tptPlayers).map(([id, p]: [string, any]) => [
            id,
            { duprId: '', nickname: '', ...p },
          ])
        )
      : {}
  );

  // Teams state — DoublesRR
  const [localDRRPlayers, setLocalDRRPlayers] = useState(() =>
    doublesRRPlayers
      ? Object.fromEntries(
          Object.entries(doublesRRPlayers).map(([id, p]: [string, any]) => [
            id,
            { duprId: '', nickname: '', ...p },
          ])
        )
      : {}
  );
  const [newDRRDraft, setNewDRRDraft] = useState({ name: '', duprId: '', nickname: '' });

  // Courts state
  const [localCourts, setLocalCourts] = useState(() => (courtNumbers || []).map((c: any) => String(c)));
  const [localSocial, setLocalSocial] = useState(() =>
    (courtNumbers || []).map((c: any) => (socialCourts || []).includes(String(c)))
  );

  // Reset confirmation state
  const [resetConfirm, setResetConfirm] = useState(false);

  // Derived
  const playedTeamIds = new Set(
    (history || []).flatMap((r: any) => (r.games || []).flatMap((g: any) => [g.winnerId, g.loserId]))
  );
  const usedIds = new Set(localTeams.map((t: any) => t.id));
  const available = ALL_TEAMS.filter((t: any) => !usedIds.has(t.id));
  const addedPlayerKeys = new Set(
    localTeams
      .flatMap((t: any) => t.players.map((p: any) => p.name))
      .map(playerKey)
      .filter(Boolean)
  );
  const usedTPTIds = new Set(localTPTTeams.map((t) => t.id));
  const availableTPT = ALL_TEAMS.filter((t) => !usedTPTIds.has(t.id));
  const addedTPTPlayerKeys = new Set(
    Object.values(localTPTPlayers)
      .map((p) => p.name)
      .map(playerKey)
      .filter(Boolean)
  );
  const drrExcludeKeys = new Set(
    Object.values(localDRRPlayers)
      .map((p) => p.name)
      .map(playerKey)
      .filter(Boolean)
  );
  const courtsValid =
    localCourts.length >= 1 &&
    localCourts.every((v: any) => v.trim() !== '') &&
    new Set(localCourts.map((v: any) => v.trim())).size === localCourts.length;
  const rrCourtCount = tournamentMode === 'roundrobin' ? (roundRobinCourts?.length ?? 0) : 0;
  const rrWarning =
    rrCourtCount > 0 && localCourts.filter((_: any, i: number) => !localSocial[i]).length < rrCourtCount;

  const handleSave = () => {
    if (canEditEventInfo) onSaveInfo({ title, location, startTime, durationMins, maxPlayers });
    if (canEditTeams) {
      if (tournamentMode === 'tpt' && onManageTPTTeamsSave) {
        const newTeams = Object.fromEntries(
          localTPTTeams.map((t: any) => [t.id, { ...t, name: t.name.trim() || t.id }])
        );
        const newPlayers = Object.fromEntries(
          Object.entries(localTPTPlayers).map(([id, p]) => [
            id,
            {
              ...p,
              name: p.name.trim() || id,
              duprId: (p.duprId || '').trim(),
              nickname: (p.nickname || '').trim(),
            },
          ])
        );
        Object.values(newPlayers).forEach((p: any) => saveKnownPlayer(p.name, p.duprId, p.nickname));
        onManageTPTTeamsSave(newTeams, newPlayers);
      } else if (tournamentMode === 'doublesrr' && onManageDoublesRRPlayersSave) {
        const newPlayers = Object.fromEntries(
          Object.entries(localDRRPlayers).map(([id, p]) => [
            id,
            {
              ...p,
              name: p.name.trim() || id,
              duprId: (p.duprId || '').trim(),
              nickname: (p.nickname || '').trim(),
            },
          ])
        );
        Object.values(newPlayers).forEach((p: any) => saveKnownPlayer(p.name, p.duprId, p.nickname));
        onManageDoublesRRPlayersSave(newPlayers);
      } else if (onManageTeamsSave) {
        const registry = localTeams.map((t: any) => {
          const players = t.players.map((p: any) => ({
            name: p.name.trim(),
            duprId: p.duprId.trim(),
            nickname: (p.nickname || '').trim(),
          }));
          const hasPlayers = players.some((p: any) => p.name);
          players
            .filter((p: any) => p.name)
            .forEach((p: any) => saveKnownPlayer(p.name, p.duprId, p.nickname));
          return {
            id: t.id,
            name: t.name.trim() || t.id,
            color: t.color,
            text: t.text,
            ...(hasPlayers ? { players } : {}),
          };
        });
        onManageTeamsSave(
          registry,
          localTeams.map((t: any) => t.id)
        );
      }
    }
    if (canEditCourts && courtsValid && onManageCourtsSave) {
      const trimmed = localCourts.map((v: any) => v.trim());
      onManageCourtsSave(
        trimmed,
        trimmed.filter((_: any, i: number) => localSocial[i])
      );
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl w-full max-w-sm flex flex-col modal-box"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tournament Settings
          </span>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* ── Event info ── */}
          {canEditEventInfo && (
            <Acc title="Event info" open={sec.info} onToggle={() => toggle('info')}>
              <div className="flex flex-col gap-3">
                <div>
                  <FL>Tournament name</FL>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={iS}
                    placeholder="Tournament"
                  />
                </div>
                <div>
                  <FL>Location</FL>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    style={iS}
                    placeholder="e.g. Lakeside Courts"
                  />
                </div>
                <div>
                  <FL>Start date &amp; time</FL>
                  <StartTimePicker startTime={startTime} setStartTime={setStartTime} />
                </div>
                <div>
                  <FL>Duration</FL>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={durationMins || ''}
                      placeholder="0"
                      onChange={(e) => setDurationMins(Math.max(0, Number(e.target.value) || 0))}
                      style={{ ...iS, width: 80, textAlign: 'center' }}
                    />
                    <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>minutes</span>
                  </div>
                </div>
                <div>
                  <FL>Max. players</FL>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={999}
                      value={maxPlayers || ''}
                      placeholder="0"
                      onChange={(e) => setMaxPlayers(Math.max(0, Number(e.target.value) || 0))}
                      style={{ ...iS, width: 80, textAlign: 'center' }}
                    />
                    <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>players</span>
                  </div>
                </div>
              </div>
            </Acc>
          )}

          {/* ── Standings order ── */}
          {canEditStandingsOrder && tournamentMode !== null && (
            <Acc title="Standings order" open={sec.standings} onToggle={() => toggle('standings')}>
              <div
                className="rounded-xl"
                style={{
                  padding: '10px 12px',
                  background: 'var(--court-faint)',
                  border: '1px solid var(--court-soft)',
                }}
              >
                <TiebreakOrderEditor
                  order={
                    tournamentMode === 'doublesrr' ? doublesRRTiebreakOrder : standingsTiebreakOrder
                  }
                  onChange={
                    tournamentMode === 'doublesrr'
                      ? onDoublesRRTiebreakOrderChange
                      : onStandingsTiebreakOrderChange
                  }
                  dark
                />
              </div>
            </Acc>
          )}

          {/* ── Team status ── */}
          {canPauseTeams &&
            tournamentMode !== 'doublesrr' &&
            onTogglePause &&
            (() => {
              const pauseTeams =
                tournamentMode === 'tpt'
                  ? Object.values(tptTeams || {})
                  : (activeTeamIds || []).map((id: any) => teamById(id)).filter(Boolean);
              const nameFor = (id: any) =>
                tournamentMode === 'tpt' ? tptTeams?.[id]?.name : teamLabel(id);
              return (
                <Acc
                  title="Team status"
                  open={sec.teamStatus}
                  onToggle={() => toggle('teamStatus')}
                >
                  <div className="flex flex-wrap" style={{ gap: 8 }}>
                    {pauseTeams.map((t: any) => {
                      const paused = (pausedIds || []).includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => onTogglePause(t.id)}
                          className="rounded-full font-bold"
                          style={{
                            padding: '5px 12px',
                            fontSize: 13,
                            background: paused ? 'rgba(0,0,0,0.05)' : t.color,
                            color: paused ? 'var(--muted)' : t.text,
                            border: `2px solid ${paused ? 'rgba(0,0,0,0.08)' : t.color}`,
                            cursor: 'pointer',
                            opacity: paused ? 0.6 : 1,
                            textDecoration: paused ? 'line-through' : 'none',
                          }}
                        >
                          {tournamentMode === 'tpt' ? t.name : teamLabel(t.id)}
                        </button>
                      );
                    })}
                  </div>
                  {(pausedIds || []).length > 0 && (
                    <p style={{ fontSize: 12, color: '#d97706', marginTop: 8 }}>
                      {(pausedIds || [])
                        .map((id: any) => nameFor(id))
                        .filter(Boolean)
                        .join(', ')}{' '}
                      paused — excluded from rotation.
                    </p>
                  )}
                </Acc>
              );
            })()}

          {/* ── Teams & players — swiss / rr ── */}
          {canEditTeams && tournamentMode !== 'tpt' && tournamentMode !== 'doublesrr' && (
            <Acc title="Teams & players" open={sec.teams} onToggle={() => toggle('teams')}>
              {onTeamNameDisplayChange && (
                <div style={{ marginBottom: 16 }}>
                  <p className="modal-label">
                    Chip display
                  </p>
                  <div
                    className="flex gap-1 rounded-xl p-1"
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {DISPLAY_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onTeamNameDisplayChange(opt.value)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background:
                            teamNameDisplay === opt.value ? 'var(--court-soft)' : 'transparent',
                          color: teamNameDisplay === opt.value ? 'var(--court)' : 'var(--muted)',
                          border:
                            teamNameDisplay === opt.value
                              ? '1px solid var(--court-soft)'
                              : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="modal-label">
                  Rename
                </p>
                <div className="flex flex-col gap-2">
                  {localTeams.map((t: any) => {
                    const filled = t.players.filter((p: any) => p.name.trim()).length;
                    return (
                      <div key={t.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <ColorSwatchPicker
                            color={t.color}
                            onChange={({ color, text }: any) =>
                              setLocalTeams((p: any) =>
                                p.map((x: any) => (x.id === t.id ? { ...x, color, text } : x))
                              )
                            }
                          />
                          <input
                            value={t.name}
                            onChange={(e) =>
                              setLocalTeams((p: any) =>
                                p.map((x: any) => (x.id === t.id ? { ...x, name: e.target.value } : x))
                              )
                            }
                            style={fS}
                          />
                          <button
                            onClick={() => setExpandedPlayerId((p) => (p === t.id ? null : t.id))}
                            title="Edit players"
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0,
                              background:
                                filled > 0 ? 'var(--court-faint)' : 'rgba(0,0,0,0.05)',
                              color: filled > 0 ? 'var(--court)' : 'var(--muted)',
                              border: '1px solid var(--court-soft)',
                            }}
                          >
                            {expandedPlayerId === t.id ? '▲' : '▼'} 👤
                            {filled > 0 ? ` ${filled}/2` : ''}
                          </button>
                          {(() => {
                            const removeDisabled =
                              localTeams.length <= 2 && playedTeamIds.has(t.id);
                            return (
                              <button
                                onClick={() => setLocalTeams((p: any) => p.filter((x: any) => x.id !== t.id))}
                                disabled={removeDisabled}
                                title={
                                  removeDisabled
                                    ? 'Cannot remove: below 2 teams and this team has already played a game'
                                    : undefined
                                }
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  cursor: removeDisabled ? 'not-allowed' : 'pointer',
                                  background: 'rgba(220,38,38,0.12)',
                                  color: removeDisabled ? '#475569' : '#f87171',
                                  border: '1px solid rgba(220,38,38,0.25)',
                                }}
                              >
                                ×
                              </button>
                            );
                          })()}
                        </div>
                        {expandedPlayerId === t.id && (
                          <div
                            className="rounded-lg p-2 flex flex-col gap-2"
                            style={{
                              marginLeft: 20,
                              background: 'rgba(0,0,0,0.04)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <p
                              style={{
                                fontSize: 10,
                                color: 'var(--muted)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                margin: 0,
                              }}
                            >
                              Players
                            </p>
                            {t.players.map((pl: any, slot: number) => (
                              <PlayerNameField
                                key={slot}
                                name={pl.name}
                                duprId={pl.duprId}
                                nickname={pl.nickname || ''}
                                knownPlayers={knownPlayers}
                                excludeKeys={addedPlayerKeys}
                                onChange={(val: any) =>
                                  setLocalTeams((p: any) =>
                                    p.map((x: any) => {
                                      if (x.id !== t.id) return x;
                                      const players = [...x.players];
                                      players[slot] = val;
                                      return { ...x, players };
                                    })
                                  )
                                }
                                inputStyle={fS}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {available.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <p className="modal-label">
                      Add a team
                    </p>
                    <button
                      onClick={() => {
                        const base = available[0];
                        setLocalTeams((p: any) => [
                          ...p,
                          {
                            id: base.id,
                            name: base.name,
                            color: base.color,
                            text: base.text,
                            players: emptyPair(),
                          },
                        ]);
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: 'var(--court-soft)',
                        color: 'var(--court)',
                        border: '1px solid var(--court-soft)',
                      }}
                    >
                      + Add team
                    </button>
                    <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      New teams start with 0 wins and join immediately. Tap a team's colour to
                      change it.
                    </p>
                  </div>
                )}
              </div>
            </Acc>
          )}

          {/* ── Teams & players — TPT ── */}
          {canEditTeams && tournamentMode === 'tpt' && (
            <Acc title="Teams & players" open={sec.teams} onToggle={() => toggle('teams')}>
              {onTeamNameDisplayChange && (
                <div style={{ marginBottom: 16 }}>
                  <p className="modal-label">
                    Chip display
                  </p>
                  <div
                    className="flex gap-1 rounded-xl p-1"
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {DISPLAY_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onTeamNameDisplayChange(opt.value)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background:
                            teamNameDisplay === opt.value ? 'var(--court-soft)' : 'transparent',
                          color: teamNameDisplay === opt.value ? 'var(--court)' : 'var(--muted)',
                          border:
                            teamNameDisplay === opt.value
                              ? '1px solid var(--court-soft)'
                              : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-4">
                {localTPTTeams.map((team) => {
                  const players = [...(team.maleIds || []), team.femaleId]
                    .filter(Boolean)
                    .map((pid) => localTPTPlayers[pid])
                    .filter(Boolean);
                  return (
                    <div
                      key={team.id}
                      className="rounded-xl p-3 flex flex-col gap-2"
                      style={{ border: `1px solid ${team.color}44`, background: `${team.color}18` }}
                    >
                      <div className="flex items-center gap-2">
                        <ColorSwatchPicker
                          color={team.color}
                          onChange={({ color, text }) =>
                            setLocalTPTTeams((p) =>
                              p.map((t) => (t.id === team.id ? { ...t, color, text } : t))
                            )
                          }
                        />
                        <input
                          value={team.name}
                          onChange={(e) =>
                            setLocalTPTTeams((p) =>
                              p.map((t) => (t.id === team.id ? { ...t, name: e.target.value } : t))
                            )
                          }
                          style={{ ...fS, fontWeight: 800, color: team.color }}
                        />
                      </div>
                      {players.map((p) => (
                        <div key={p.id} className="flex items-start gap-2">
                          <span
                            style={{
                              fontSize: 11,
                              color: p.gender === 'female' ? '#f9a8d4' : '#93c5fd',
                              fontWeight: 700,
                              width: 14,
                              flexShrink: 0,
                              marginTop: 8,
                            }}
                          >
                            {p.gender === 'female' ? '♀' : '♂'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <PlayerNameField
                              name={p.name}
                              duprId={p.duprId}
                              nickname={p.nickname || ''}
                              knownPlayers={knownPlayers}
                              excludeKeys={addedTPTPlayerKeys}
                              onChange={(val: any) =>
                                setLocalTPTPlayers((prev) => ({
                                  ...prev,
                                  [p.id]: { ...(prev as any)[p.id], ...val },
                                }))
                              }
                              inputStyle={fS}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              {availableTPT.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <p className="modal-label">
                    Add a team
                  </p>
                  <button
                    onClick={() => {
                      const base = availableTPT[0];
                      const m1 = uid(),
                        m2 = uid(),
                        f = uid();
                      setLocalTPTTeams((p) => [
                        ...p,
                        {
                          id: base.id,
                          name: base.name,
                          color: base.color,
                          text: base.text,
                          maleIds: [m1, m2],
                          femaleId: f,
                        },
                      ]);
                      setLocalTPTPlayers((p) => ({
                        ...p,
                        [m1]: { id: m1, name: '', duprId: '', nickname: '', gender: 'male' },
                        [m2]: { id: m2, name: '', duprId: '', nickname: '', gender: 'male' },
                        [f]: { id: f, name: '', duprId: '', nickname: '', gender: 'female' },
                      }));
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: 'var(--court-soft)',
                      color: 'var(--court)',
                      border: '1px solid var(--court-soft)',
                    }}
                  >
                    + Add team
                  </button>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    New teams join the schedule when you save. Tap a team's colour to change it.
                  </p>
                </div>
              )}
            </Acc>
          )}

          {/* ── Players — DoublesRR ── */}
          {canEditTeams && tournamentMode === 'doublesrr' && (
            <Acc title="Players" open={sec.teams} onToggle={() => toggle('teams')}>
              {onTeamNameDisplayChange && (
                <div style={{ marginBottom: 16 }}>
                  <p className="modal-label">
                    Chip display
                  </p>
                  <div
                    className="flex gap-1 rounded-xl p-1"
                    style={{
                      background: 'rgba(0,0,0,0.05)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {DISPLAY_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => onTeamNameDisplayChange(opt.value)}
                        style={{
                          flex: 1,
                          padding: '6px 4px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background:
                            teamNameDisplay === opt.value ? 'var(--court-soft)' : 'transparent',
                          color: teamNameDisplay === opt.value ? 'var(--court)' : 'var(--muted)',
                          border:
                            teamNameDisplay === opt.value
                              ? '1px solid var(--court-soft)'
                              : '1px solid transparent',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {Object.values(localDRRPlayers).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl p-3 flex items-center gap-2"
                    style={{
                      border: `1px solid ${p.color || '#64748b'}44`,
                      background: `${p.color || '#64748b'}18`,
                    }}
                  >
                    <ColorSwatchPicker
                      color={p.color || '#64748b'}
                      onChange={({ color, text }: any) =>
                        setLocalDRRPlayers((prev) => ({
                          ...prev,
                          [p.id]: { ...(prev as any)[p.id], color, text },
                        }))
                      }
                    />
                    <div style={{ flex: 1 }}>
                      <NicknameField
                        name={p.name}
                        nickname={p.nickname || ''}
                        onChange={(updates: any) =>
                          setLocalDRRPlayers((prev) => ({
                            ...prev,
                            [p.id]: { ...(prev as any)[p.id], ...updates },
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <p className="modal-label">
                  Add a player
                </p>
                <div className="flex gap-2 items-start">
                  <div style={{ flex: 1 }}>
                    <PlayerNameField
                      name={newDRRDraft.name}
                      duprId={newDRRDraft.duprId}
                      nickname={newDRRDraft.nickname}
                      knownPlayers={knownPlayers}
                      excludeKeys={drrExcludeKeys}
                      onChange={setNewDRRDraft}
                      inputStyle={fS}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const name = newDRRDraft.name.trim();
                      if (!name) return;
                      const id = uid();
                      const pal = ALL_TEAMS[Object.keys(localDRRPlayers).length % ALL_TEAMS.length];
                      setLocalDRRPlayers((p) => ({
                        ...p,
                        [id]: {
                          id,
                          name,
                          duprId: newDRRDraft.duprId.trim(),
                          nickname: newDRRDraft.nickname.trim(),
                          color: pal.color,
                          text: pal.text,
                        },
                      }));
                      setNewDRRDraft({ name: '', duprId: '', nickname: '' });
                    }}
                    disabled={!newDRRDraft.name.trim()}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 13,
                      flexShrink: 0,
                      cursor: newDRRDraft.name.trim() ? 'pointer' : 'not-allowed',
                      background: newDRRDraft.name.trim()
                        ? 'var(--court-soft)'
                        : 'rgba(0,0,0,0.04)',
                      color: newDRRDraft.name.trim() ? 'var(--court)' : 'var(--muted)',
                      border: '1px solid var(--court-soft)',
                    }}
                  >
                    + Add
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  New players join the schedule when you save (requires a valid player count — see
                  Play tab).
                </p>
              </div>
            </Acc>
          )}

          {/* ── Courts ── */}
          {canEditCourts && (
            <Acc title="Courts" open={sec.courts} onToggle={() => toggle('courts')}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Rename, add, or remove courts. Social courts are excluded from round generation.
              </p>
              {rrWarning && (
                <div className="notice-amber" style={{ marginBottom: 12 }}>
                  ⚠️ Round Robin is active with {rrCourtCount} court{rrCourtCount !== 1 ? 's' : ''}{' '}
                  — reducing competitive courts below that may break the schedule.
                </div>
              )}
              <div className="flex flex-col gap-2">
                {localCourts.map((c: any, i: number) => {
                  const dup = localCourts
                    .filter((_: any, j: number) => j !== i)
                    .map((v: any) => v.trim())
                    .includes(c.trim());
                  const invalid = c.trim() === '' || dup;
                  const isSocial = localSocial[i];
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: 12,
                          color: '#64748b',
                          fontWeight: 700,
                          width: 20,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}.
                      </span>
                      <input
                        value={c}
                        onChange={(e) =>
                          setLocalCourts((p: any) => p.map((x: any, j: number) => (j === i ? e.target.value : x)))
                        }
                        style={{
                          minWidth: 0,
                          ...fS,
                          border: `1px solid ${invalid ? '#ef4444' : 'var(--border)'}`,
                        }}
                      />
                      <button
                        onClick={() => setLocalSocial((p: any) => p.map((v: any, j: number) => (j === i ? !v : v)))}
                        title={isSocial ? 'Mark as competitive' : 'Mark as warm up / social'}
                        style={{
                          flexShrink: 0,
                          width: 76,
                          padding: '4px 2px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          lineHeight: 1.2,
                          cursor: 'pointer',
                          background: isSocial ? 'var(--court-soft)' : 'rgba(0,0,0,0.05)',
                          color: isSocial ? 'var(--court)' : 'var(--muted)',
                          border: `1px solid ${isSocial ? 'var(--court-soft)' : 'var(--border)'}`,
                        }}
                      >
                        Warm up / Social
                      </button>
                      <button
                        onClick={() => {
                          setLocalCourts((p: any) => p.filter((_: any, j: number) => j !== i));
                          setLocalSocial((p: any) => p.filter((_: any, j: number) => j !== i));
                        }}
                        disabled={localCourts.length <= 1}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                          cursor: localCourts.length <= 1 ? 'not-allowed' : 'pointer',
                          background: 'rgba(220,38,38,0.15)',
                          color: localCourts.length <= 1 ? '#475569' : '#f87171',
                          border: '1px solid rgba(220,38,38,0.3)',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  const existing = new Set(localCourts.map((v: any) => v.trim()));
                  let n = localCourts.length + 1;
                  while (existing.has(String(n))) n++;
                  setLocalCourts((p: any) => [...p, String(n)]);
                  setLocalSocial((p: any) => [...p, false]);
                }}
                style={{
                  marginTop: 10,
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'var(--court-soft)',
                  color: 'var(--court)',
                  border: '1px solid var(--court-soft)',
                }}
              >
                + Add court
              </button>
              {!courtsValid && (
                <p style={{ fontSize: 12, color: '#fbbf24', marginTop: 6 }}>
                  Court names must be unique and non-empty.
                </p>
              )}
            </Acc>
          )}

          {/* ── Access PINs ── */}
          {isOwner && (
            <Acc title="Access PINs" open={sec.pins} onToggle={() => toggle('pins')}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                Create PINs that let admins and referees access this tournament without a Google
                login. Add as many as you like and revoke any of them at any time.
              </p>
              {ROLES.map((r) => (
                <div key={r.id} style={{ marginBottom: 16 }}>
                  <p className="modal-label">
                    {r.title} PINs
                  </p>
                  <div className="flex flex-col gap-2" style={{ marginBottom: 8 }}>
                    {(pins?.[r.id] || []).length === 0 && (
                      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                        No PINs configured.
                      </p>
                    )}
                    {(pins?.[r.id] || []).map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                          {p.label || 'Unnamed'}
                          {sessionPins[p.id] && (
                            <span style={{ color: 'var(--court)', fontWeight: 800 }}>
                              {' '}
                              · {sessionPins[p.id]}
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => onRevokePin(r.id, p.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: 'rgba(220,38,38,0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(220,38,38,0.25)',
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                  <AddPinForm
                    roleId={r.id}
                    onAddPin={onAddPin}
                    onAdded={(id: string, digits: string) => setSessionPins((prev) => ({ ...prev, [id]: digits }))}
                  />
                </div>
              ))}
            </Acc>
          )}

          {/* ── Reset ── */}
          {canResetTournament && (
            <Acc title="Reset tournament" open={sec.reset} onToggle={() => toggle('reset')} danger>
              {!resetConfirm ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
                    Ends the current tournament and resets all match data. Teams and courts are
                    preserved.
                  </p>
                  <button
                    onClick={() => setResetConfirm(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      background: 'rgba(220,38,38,0.1)',
                      color: '#fca5a5',
                      border: '1px solid rgba(220,38,38,0.3)',
                    }}
                  >
                    Reset tournament…
                  </button>
                </>
              ) : (
                <div
                  className="rounded-xl p-3 flex flex-col gap-3"
                  style={{
                    background: 'rgba(220,38,38,0.07)',
                    border: '1px solid rgba(220,38,38,0.25)',
                  }}
                >
                  <p style={{ fontSize: 13, color: '#fca5a5', fontWeight: 700, margin: 0 }}>
                    Are you sure? All match history will be lost. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setResetConfirm(false)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.05)',
                        color: 'var(--muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onReset}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: 'rgba(220,38,38,0.25)',
                        color: '#fca5a5',
                        border: '1px solid rgba(220,38,38,0.4)',
                      }}
                    >
                      Confirm reset
                    </button>
                  </div>
                </div>
              )}
            </Acc>
          )}
        </div>

        {/* Fixed footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: '12px 20px',
            flexShrink: 0,
          }}
        >
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


