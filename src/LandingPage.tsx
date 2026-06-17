import { useEffect, useMemo, useState } from 'react';
import ballIcon from '/ball.png';
import { useAllClubs } from './hooks/useAllClubs';
import { TOURNAMENT_MODES, splitAndSortTournaments, applyLandingFilters } from './landingFilters';
import ClubMembersPanel from './components/ClubMembersPanel';

function toSlug(title: string) {
  return (
    (title || 'tournament')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'tournament'
  );
}

function buildSlugMap(tournaments: any[]) {
  const slugCount: Record<string, number> = {};
  tournaments.forEach((t: any) => {
    const s = toSlug(t.title);
    slugCount[s] = (slugCount[s] || 0) + 1;
  });
  const idToSlug: Record<string, string> = {},
    slugToId: Record<string, string> = {};
  tournaments.forEach((t: any) => {
    const base = toSlug(t.title);
    const slug = slugCount[base] > 1 ? `${base}-${t.id.slice(0, 6)}` : base;
    idToSlug[t.id] = slug;
    slugToId[slug] = t.id;
  });
  return { idToSlug, slugToId };
}

// Landing-page filter state persisted across sessions in localStorage.
const LS_KEYS = {
  hiddenClubs: 'livepickle:hiddenClubs',
  enabledModes: 'livepickle:enabledModes',
  hideFull: 'livepickle:hideFull',
};

function readStoredJSON(key: string, fallback: any) {
  try {
    const raw = localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJSON(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (e.g. private browsing) — filters just won't persist
  }
}

const MODE_LABELS = {
  swiss: 'Swiss',
  roundrobin: 'Round Robin',
  tpt: 'Trio Teams',
  doublesrr: 'Doubles RR',
};

const STATUS_STYLES = {
  active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  setup: { bg: '#fef9c3', color: '#ca8a04', label: 'Setup' },
  finished: { bg: '#f1f5f9', color: '#64748b', label: 'Finished' },
};

function formatStartTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function TournamentCard({ t, onClick, onDelete }: { t: any; onClick: () => void; onDelete?: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const statusStyle = (STATUS_STYLES as any)[t.status] ?? STATUS_STYLES.finished;
  const modeLabel = (MODE_LABELS as any)[t.mode] ?? t.mode ?? '';
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.15s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,76,117,0.12)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}
    >
      {/* Top row: title + meta on left, delete button on right */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: '#0f172a',
              marginBottom: 6,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.title || 'Untitled Tournament'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {modeLabel && (
              <span
                style={{
                  background: 'rgba(15,76,117,0.08)',
                  color: '#0f4c75',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                {modeLabel}
              </span>
            )}
            <span
              style={{
                background: statusStyle.bg,
                color: statusStyle.color,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
              }}
            >
              {statusStyle.label}
            </span>
            {(t.playerCount > 0 || t.teamCount > 0) && (
              <span style={{ color: '#64748b', fontSize: 12 }}>
                {(() => {
                  const n = t.playerCount || t.teamCount;
                  return t.maxPlayers > 0 ? `${n} / ${t.maxPlayers} players` : `${n} players`;
                })()}
              </span>
            )}
          </div>
          {(t.startTime || t.location) && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {t.startTime && (
                <span style={{ color: '#475569', fontSize: 12 }}>
                  {formatStartTime(t.startTime)}
                </span>
              )}
              {t.location && (
                <span style={{ color: '#64748b', fontSize: 12 }}>📍 {t.location}</span>
              )}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {confirming ? (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}
            >
              <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>Delete?</span>
              <button
                onClick={() => onDelete?.(t.id)}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.06)',
                  color: '#475569',
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : onDelete ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirming(true);
                }}
                title="Delete tournament"
                style={{
                  fontSize: 13,
                  lineHeight: 1,
                  padding: '3px 7px',
                  borderRadius: 7,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'rgba(220,38,38,0.08)',
                  color: '#dc2626',
                  border: '1px solid rgba(220,38,38,0.15)',
                }}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mini podium for finished tournaments */}
      {t.status === 'finished' && t.top3?.length > 0 && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {[t.top3[1], t.top3[0], t.top3[2]].map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: '1 1 0' }} />;
            const medals = ['🥈', '🥇', '🥉'];
            const positions = [2, 1, 3];
            const barH = [22, 30, 16];
            const barBg =
              i === 1
                ? 'linear-gradient(180deg,#fbbf24,#d97706)'
                : i === 0
                  ? 'linear-gradient(180deg,#cbd5e1,#94a3b8)'
                  : 'linear-gradient(180deg,#f59e42,#b45309)';
            const hasStats = entry.wins != null && entry.losses != null && entry.scoreDiff != null;
            const diffStr = hasStats
              ? entry.scoreDiff > 0
                ? `+${entry.scoreDiff}`
                : `${entry.scoreDiff}`
              : null;
            return (
              <div
                key={i}
                style={{
                  flex: '1 1 0',
                  maxWidth: 110,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{medals[i]}</span>
                <span
                  style={{
                    background: entry.color,
                    color: entry.text,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 6,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    textAlign: 'center',
                  }}
                >
                  {entry.name}
                </span>
                {hasStats && (
                  <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>
                    {entry.wins}W · {entry.losses}L · {diffStr}
                  </span>
                )}
                <div
                  style={{
                    width: '100%',
                    height: barH[i],
                    borderRadius: '4px 4px 0 0',
                    background: barBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {positions[i]}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClubTogglesRow({ clubs, hiddenClubs, onToggle }: { clubs: any[]; hiddenClubs: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {clubs.map(({ clubId, clubInfo }: { clubId: string; clubInfo: any }) => {
        const active = !hiddenClubs.has(clubId);
        return (
          <button
            key={clubId}
            onClick={() => onToggle(clubId)}
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              background: active ? 'rgba(15,76,117,0.08)' : 'transparent',
              color: active ? '#0f4c75' : '#94a3b8',
              border: active ? '1px solid rgba(15,76,117,0.2)' : '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {clubInfo?.name ?? clubId}
          </button>
        );
      })}
    </div>
  );
}

function FilterControls({ enabledModes, onToggleMode, hideFull, onToggleHideFull }: { enabledModes: Set<string>; onToggleMode: (m: string) => void; hideFull: boolean; onToggleHideFull: () => void }) {
  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  };
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        alignItems: 'center',
        marginBottom: 16,
        padding: '10px 14px',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Filters
      </span>
      {TOURNAMENT_MODES.map((mode) => (
        <label key={mode} style={labelStyle}>
          <input
            type="checkbox"
            checked={enabledModes.has(mode)}
            onChange={() => onToggleMode(mode)}
          />
          {MODE_LABELS[mode]}
        </label>
      ))}
      <label style={labelStyle}>
        <input type="checkbox" checked={hideFull} onChange={onToggleHideFull} />
        Hide full tournaments
      </label>
    </div>
  );
}

function ClubSection({
  clubId,
  clubInfo,
  upcoming,
  finished,
  hasAnyTournaments,
  isOwned,
  onCreateTournament,
  onSelectTournament,
  onDelete,
  onManageMembers,
  idToSlug,
}: any) {
  function handleCardClick(t: any) {
    const slug = idToSlug[t.id] || t.id;
    history.pushState({ clubId, tournamentId: t.id }, '', `#${clubId}/${slug}`);
    onSelectTournament(clubId, t.id);
  }

  const noneVisible = upcoming.length === 0 && finished.length === 0;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <img
          src={clubInfo?.imageUrl || ballIcon}
          alt={`${clubInfo?.name ?? clubId} logo`}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            color: '#0f4c75',
            letterSpacing: '-0.3px',
            flex: 1,
          }}
        >
          {clubInfo?.name ?? clubId}
        </div>
        {isOwned && (
          <button
            onClick={onManageMembers}
            style={{
              fontSize: 13,
              padding: '6px 16px',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(15,76,117,0.08)',
              color: '#0f4c75',
              border: '1px solid rgba(15,76,117,0.2)',
            }}
          >
            Club members
          </button>
        )}
        {isOwned && (
          <button
            onClick={onCreateTournament}
            style={{
              fontSize: 13,
              padding: '6px 16px',
              borderRadius: 10,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'linear-gradient(90deg,#0f4c75,#1a6fa8)',
              color: '#fff',
              border: 'none',
              boxShadow: '0 2px 6px rgba(15,76,117,0.3)',
            }}
          >
            + New Tournament
          </button>
        )}
      </div>

      {!hasAnyTournaments ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
            No tournaments yet
          </div>
          {isOwned && (
            <div style={{ fontSize: 14 }}>
              Click <strong>+ New Tournament</strong> to get started
            </div>
          )}
        </div>
      ) : noneVisible ? (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: '#94a3b8', fontSize: 14 }}>
          No tournaments match the current filters
        </div>
      ) : (
        <>
          <div style={{ marginBottom: finished.length > 0 ? 16 : 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}
            >
              Upcoming
            </div>
            {upcoming.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: '4px 0' }}>
                No upcoming tournaments
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map((t: any) => (
                  <TournamentCard
                    key={t.id}
                    t={t}
                    onClick={() => handleCardClick(t)}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {finished.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 8,
                }}
              >
                Finished
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finished.map((t: any) => (
                  <TournamentCard
                    key={t.id}
                    t={t}
                    onClick={() => handleCardClick(t)}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NewClubForm({ onCreateClub }: { onCreateClub: (name: string) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreateClub(name.trim());
      setName('');
      setOpen(false);
    } catch {
      setError('Failed to create club');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: 13,
          padding: '6px 16px',
          borderRadius: 10,
          fontWeight: 700,
          cursor: 'pointer',
          background: 'rgba(15,76,117,0.08)',
          color: '#0f4c75',
          border: '1px solid rgba(15,76,117,0.2)',
        }}
      >
        + New Club
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Club name"
        style={{
          fontSize: 13,
          padding: '6px 12px',
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        style={{
          fontSize: 13,
          padding: '6px 16px',
          borderRadius: 10,
          fontWeight: 700,
          cursor: name.trim() ? 'pointer' : 'default',
          background: name.trim() ? 'linear-gradient(90deg,#0f4c75,#1a6fa8)' : 'rgba(0,0,0,0.06)',
          color: name.trim() ? '#fff' : '#94a3b8',
          border: 'none',
        }}
      >
        {saving ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setName('');
          setError('');
        }}
        style={{
          fontSize: 13,
          padding: '6px 16px',
          borderRadius: 10,
          fontWeight: 600,
          cursor: 'pointer',
          background: 'rgba(0,0,0,0.04)',
          color: '#64748b',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        Cancel
      </button>
      {error && <span style={{ color: '#dc2626', fontSize: 12 }}>{error}</span>}
    </form>
  );
}

interface LandingPageProps {
  onSelectTournament: (clubId: string, id: string) => void;
  onCreateTournament: (clubId: string) => void;
  user: any;
  onSignIn: () => void;
  onSignOut: () => void;
  ownedClubIds?: string[];
  onCreateClub: (name: string) => Promise<any>;
}
export default function LandingPage({
  onSelectTournament,
  onCreateTournament,
  user,
  onSignIn,
  onSignOut,
  ownedClubIds = [],
  onCreateClub,
}: LandingPageProps) {
  const { clubs, loading, error, refresh, deleteTournament } = useAllClubs();

  // Per-club visibility toggle. Default: all visible. Persisted in localStorage.
  const [hiddenClubs, setHiddenClubs] = useState<Set<string>>(
    () => new Set(readStoredJSON(LS_KEYS.hiddenClubs, []))
  );

  // Club whose members panel is open, if any.
  const [membersClubId, setMembersClubId] = useState(null);

  // Global filters. Default: all tournament types shown, full tournaments shown.
  // Persisted in localStorage.
  const [enabledModes, setEnabledModes] = useState(() => {
    const stored = readStoredJSON(LS_KEYS.enabledModes, null);
    return new Set(
      Array.isArray(stored) ? stored.filter((m) => TOURNAMENT_MODES.includes(m)) : TOURNAMENT_MODES
    );
  });
  const [hideFull, setHideFull] = useState<boolean>(() => readStoredJSON(LS_KEYS.hideFull, false));

  // Persist filter changes for next session.
  useEffect(() => {
    writeStoredJSON(LS_KEYS.hiddenClubs, [...hiddenClubs]);
  }, [hiddenClubs]);
  useEffect(() => {
    writeStoredJSON(LS_KEYS.enabledModes, [...enabledModes]);
  }, [enabledModes]);
  useEffect(() => {
    writeStoredJSON(LS_KEYS.hideFull, hideFull);
  }, [hideFull]);

  // Refresh whenever the landing page mounts (e.g. after creating a tournament)
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-club slug maps, built over every club regardless of visibility/filters
  // so deep links keep working even for a club the user has toggled off.
  const slugMaps = useMemo(
    () =>
      Object.fromEntries(
        clubs.map(({ clubId, tournaments }) => [clubId, buildSlugMap(tournaments)])
      ),
    [clubs]
  );

  // Auto-navigate to a tournament from the URL hash on initial load.
  // Hash format is `#{clubId}/{slug}`; a bare `#{slug}` (pre-multi-club links)
  // falls back to searching every club's slug map.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const slashIdx = hash.indexOf('/');
    if (slashIdx > 0) {
      const clubId = hash.slice(0, slashIdx);
      const slug = hash.slice(slashIdx + 1);
      const id = slugMaps[clubId]?.slugToId?.[slug];
      if (id) {
        onSelectTournament(clubId, id);
        return;
      }
    }

    for (const { clubId } of clubs) {
      const id = slugMaps[clubId]?.slugToId?.[hash];
      if (id) {
        onSelectTournament(clubId, id);
        return;
      }
    }
  }, [loading, clubs, slugMaps]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleClub(clubId: string) {
    setHiddenClubs((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId);
      else next.add(clubId);
      return next;
    });
  }

  function toggleMode(mode: string) {
    setEnabledModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode);
      else next.add(mode);
      return next;
    });
  }

  const visibleClubs = clubs.filter((c) => !hiddenClubs.has(c.clubId));
  const hasAnyTournamentsAnywhere = clubs.some((c) => c.tournaments.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* App header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '20px clamp(12px,3vw,20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img
              src={ballIcon}
              alt="Live Pickle"
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            />
            <div>
              <div
                style={{ fontSize: 24, fontWeight: 900, color: '#0f4c75', letterSpacing: '-0.5px' }}
              >
                Live Pickle
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                Tournament Directory
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={refresh}
              title="Refresh"
              style={{
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(0,0,0,0.04)',
                color: '#64748b',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              ↻ Refresh
            </button>
            {user ? (
              <button
                onClick={onSignOut}
                title={user.email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.04)',
                  color: '#64748b',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    style={{ width: 20, height: 20, borderRadius: '50%' }}
                  />
                ) : (
                  '👤'
                )}
                Sign out
              </button>
            ) : (
              <button
                onClick={onSignIn}
                style={{
                  fontSize: 13,
                  padding: '6px 12px',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.04)',
                  color: '#64748b',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px clamp(12px,3vw,20px)' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 15 }}>
            Loading tournaments...
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#dc2626', fontSize: 15 }}>
            {error}
            <br />
            <button
              onClick={refresh}
              style={{
                marginTop: 12,
                fontSize: 13,
                padding: '6px 16px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
                background: 'rgba(220,38,38,0.1)',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.2)',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {user && (
              <div style={{ marginBottom: 16 }}>
                <NewClubForm onCreateClub={onCreateClub} />
              </div>
            )}

            {clubs.length > 1 && (
              <ClubTogglesRow clubs={clubs} hiddenClubs={hiddenClubs} onToggle={toggleClub} />
            )}

            {hasAnyTournamentsAnywhere && (
              <FilterControls
                enabledModes={enabledModes}
                onToggleMode={toggleMode}
                hideFull={hideFull}
                onToggleHideFull={() => setHideFull((v) => !v)}
              />
            )}

            {visibleClubs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: '#94a3b8',
                  fontSize: 14,
                }}
              >
                All clubs hidden — click a club above to show it
              </div>
            ) : (
              visibleClubs.map(({ clubId, clubInfo, tournaments }) => {
                const { upcoming, finished } = applyLandingFilters(
                  splitAndSortTournaments(tournaments),
                  { enabledModes, hideFull }
                );
                return (
                  <ClubSection
                    key={clubId}
                    clubId={clubId}
                    clubInfo={clubInfo}
                    upcoming={upcoming}
                    finished={finished}
                    hasAnyTournaments={tournaments.length > 0}
                    isOwned={ownedClubIds.includes(clubId)}
                    onCreateTournament={() => onCreateTournament(clubId)}
                    onSelectTournament={onSelectTournament}
                    onDelete={
                      ownedClubIds.includes(clubId) ? (tid: string) => deleteTournament(clubId, tid) : null
                    }
                    onManageMembers={() => setMembersClubId(clubId)}
                    idToSlug={slugMaps[clubId]?.idToSlug ?? {}}
                  />
                );
              })
            )}
          </>
        )}
      </div>

      {membersClubId && (
        <ClubMembersPanel clubId={membersClubId} onClose={() => setMembersClubId(null)} />
      )}
    </div>
  );
}
