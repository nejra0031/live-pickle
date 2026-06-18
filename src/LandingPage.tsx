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
  const idToSlug: Record<string, string> = {}, slugToId: Record<string, string> = {};
  tournaments.forEach((t: any) => {
    const base = toSlug(t.title);
    const slug = slugCount[base] > 1 ? `${base}-${t.id.slice(0, 6)}` : base;
    idToSlug[t.id] = slug;
    slugToId[slug] = t.id;
  });
  return { idToSlug, slugToId };
}

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
  } catch {}
}

const MODE_LABELS: Record<string, string> = {
  swiss: 'Swiss',
  roundrobin: 'Round Robin',
  tpt: 'Trio Teams',
  doublesrr: 'Doubles RR',
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  setup: { bg: '#fef9c3', color: '#ca8a04', label: 'Setup' },
  finished: { bg: '#f1f5f9', color: '#64748b', label: 'Finished' },
};

function formatStartTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function TournamentCard({ t, onClick, onDelete }: { t: any; onClick: () => void; onDelete?: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const statusStyle = STATUS_STYLES[t.status] ?? STATUS_STYLES.finished;
  const modeLabel = MODE_LABELS[t.mode] ?? t.mode ?? '';
  const isActive = t.status === 'active';
  const isSetup = t.status === 'setup';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={isActive ? 'card-live' : ''}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'var(--white)',
        borderTop: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderLeft: isActive ? '4px solid var(--ball)'
                  : isSetup ? '3px solid var(--court)'
                  : '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px 18px',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(27,122,120,0.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)')}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 17,
              color: 'var(--ink)',
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
                  background: 'var(--court-faint)',
                  color: 'var(--court)',
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
              <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {(() => {
                  const n = t.playerCount || t.teamCount;
                  return t.maxPlayers > 0 ? `${n} / ${t.maxPlayers} players` : `${n} players`;
                })()}
              </span>
            )}
            {t.timerMins > 0 && (
              <span style={{ color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ⏱ {t.timerMins}m/round
              </span>
            )}
          </div>
          {(t.startTime || t.location) && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {t.startTime && (
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>{formatStartTime(t.startTime)}</span>
              )}
              {t.location && (
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>📍 {t.location}</span>
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
              <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center' }}>Delete?</span>
              <button
                onClick={() => onDelete?.(t.id)}
                style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                  background: 'var(--red)', color: '#fff', border: 'none',
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  fontSize: 12, padding: '3px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.06)', color: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                Cancel
              </button>
            </div>
          ) : onDelete ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                title="Delete tournament"
                style={{
                  fontSize: 13, lineHeight: 1, padding: '3px 7px', borderRadius: 7, fontWeight: 700, cursor: 'pointer',
                  background: 'var(--red-faint)', color: 'var(--red)',
                  border: '1px solid var(--red-soft)',
                }}
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {t.status === 'finished' && t.top3?.length > 0 && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {[t.top3[1], t.top3[0], t.top3[2]].map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: '1 1 0' }} />;
            const medals = ['🥈', '🥇', '🥉'];
            const barH = [22, 30, 16];
            const barBg =
              i === 1
                ? 'linear-gradient(180deg,#fbbf24,#d97706)'
                : i === 0
                  ? 'linear-gradient(180deg,#cbd5e1,#94a3b8)'
                  : 'linear-gradient(180deg,#f59e42,#b45309)';
            const hasStats = entry.wins != null && entry.losses != null && entry.scoreDiff != null;
            const diffStr = hasStats
              ? entry.scoreDiff > 0 ? `+${entry.scoreDiff}` : `${entry.scoreDiff}`
              : null;
            return (
              <div key={i} style={{ flex: '1 1 0', maxWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span
                  style={{
                    background: entry.color,
                    color: entry.text,
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: 999,
                    border: '2px solid rgba(255,255,255,0.5)',
                    boxShadow: `0 2px 6px ${entry.color}55`,
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
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500, color: 'var(--muted)' }}>
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
                    fontSize: 11,
                  }}
                >
                  {medals[i]}
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
              fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
              background: active ? 'var(--court-faint)' : 'transparent',
              color: active ? 'var(--court)' : 'var(--muted)',
              border: active ? '1px solid var(--court-soft)' : '1px solid var(--border)',
            }}
          >
            {clubInfo?.name ?? clubId}
          </button>
        );
      })}
    </div>
  );
}

function FilterControls({ enabledModes, onToggleMode, hideFull, onToggleHideFull }: {
  enabledModes: Set<string>;
  onToggleMode: (m: string) => void;
  hideFull: boolean;
  onToggleHideFull: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
      {TOURNAMENT_MODES.map((mode) => {
        const active = enabledModes.has(mode);
        return (
          <button
            key={mode}
            onClick={() => onToggleMode(mode)}
            style={{
              fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
              background: active ? 'var(--court-faint)' : 'transparent',
              color: active ? 'var(--court)' : 'var(--muted)',
              border: active ? '1px solid var(--court-soft)' : '1px solid var(--border)',
            }}
          >
            {MODE_LABELS[mode]}
          </button>
        );
      })}
      <button
        onClick={onToggleHideFull}
        style={{
          fontSize: 13, fontWeight: 700, padding: '6px 14px', borderRadius: 999, cursor: 'pointer',
          background: hideFull ? 'var(--court-faint)' : 'transparent',
          color: hideFull ? 'var(--court)' : 'var(--muted)',
          border: hideFull ? '1px solid var(--court-soft)' : '1px solid var(--border)',
        }}
      >
        Hide full
      </button>
    </div>
  );
}

function ClubSection({
  clubId, clubInfo, upcoming, finished, hasAnyTournaments,
  isOwned, onCreateTournament, onSelectTournament, onDelete, onManageMembers, idToSlug,
}: any) {
  function handleCardClick(t: any) {
    const slug = idToSlug[t.id] || t.id;
    history.pushState({ clubId, tournamentId: t.id }, '', `#${clubId}/${slug}`);
    onSelectTournament(clubId, t.id);
  }

  const noneVisible = upcoming.length === 0 && finished.length === 0;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 12,
            borderLeft: '3px solid var(--court)',
          }}
        >
          <img
            src={clubInfo?.imageUrl || ballIcon}
            alt={`${clubInfo?.name ?? clubId} logo`}
            style={{
              width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
              flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--court)',
              letterSpacing: '-0.2px',
            }}
          >
            {clubInfo?.name ?? clubId}
          </span>
        </div>
        {isOwned && (
          <button
            onClick={onManageMembers}
            style={{
              fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              background: 'var(--court-faint)', color: 'var(--court)',
              border: '1px solid var(--court-soft)',
            }}
          >
            Club members
          </button>
        )}
        {isOwned && (
          <button
            onClick={onCreateTournament}
            style={{
              fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              background: 'var(--court)', color: '#fff', border: 'none',
              boxShadow: '0 2px 8px rgba(27,122,120,0.25)',
            }}
          >
            + New Tournament
          </button>
        )}
      </div>

      {!hasAnyTournaments ? (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
            No tournaments yet
          </div>
          {isOwned && (
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>
              Click <strong>+ New Tournament</strong> to get started
            </div>
          )}
        </div>
      ) : noneVisible ? (
        <div style={{ textAlign: 'center', padding: '32px 24px', color: 'var(--muted)', fontSize: 14 }}>
          No tournaments match the current filters
        </div>
      ) : (
        <>
          <div style={{ marginBottom: finished.length > 0 ? 20 : 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Upcoming
            </div>
            {upcoming.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '4px 0' }}>
                No upcoming tournaments
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map((t: any) => (
                  <TournamentCard key={t.id} t={t} onClick={() => handleCardClick(t)} onDelete={onDelete} />
                ))}
              </div>
            )}
          </div>

          {finished.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Finished
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {finished.map((t: any) => (
                  <TournamentCard key={t.id} t={t} onClick={() => handleCardClick(t)} onDelete={onDelete} />
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
          fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
          background: 'var(--court-faint)', color: 'var(--court)',
          border: '1px solid var(--court-soft)',
        }}
      >
        + New Club
      </button>
    );
  }

  return (
    <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Club name"
        style={{
          fontSize: 13, padding: '6px 12px', borderRadius: 10,
          border: '1px solid var(--court-soft)', outline: 'none',
          fontFamily: 'var(--font-body)',
        }}
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        style={{
          fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 700,
          cursor: name.trim() ? 'pointer' : 'default',
          background: name.trim() ? 'var(--court)' : 'rgba(0,0,0,0.06)',
          color: name.trim() ? '#fff' : 'var(--muted)',
          border: 'none',
        }}
      >
        {saving ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setName(''); setError(''); }}
        style={{
          fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
          background: 'rgba(0,0,0,0.04)', color: 'var(--muted)',
          border: '1px solid var(--border)',
        }}
      >
        Cancel
      </button>
      {error && <span style={{ color: 'var(--red)', fontSize: 12 }}>{error}</span>}
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

  const [hiddenClubs, setHiddenClubs] = useState<Set<string>>(
    () => new Set(readStoredJSON(LS_KEYS.hiddenClubs, []))
  );
  const [membersClubId, setMembersClubId] = useState(null);
  const [enabledModes, setEnabledModes] = useState(() => {
    const stored = readStoredJSON(LS_KEYS.enabledModes, null);
    return new Set(
      Array.isArray(stored) ? stored.filter((m) => TOURNAMENT_MODES.includes(m)) : TOURNAMENT_MODES
    );
  });
  const [hideFull, setHideFull] = useState<boolean>(() => readStoredJSON(LS_KEYS.hideFull, false));

  useEffect(() => { writeStoredJSON(LS_KEYS.hiddenClubs, [...hiddenClubs]); }, [hiddenClubs]);
  useEffect(() => { writeStoredJSON(LS_KEYS.enabledModes, [...enabledModes]); }, [enabledModes]);
  useEffect(() => { writeStoredJSON(LS_KEYS.hideFull, hideFull); }, [hideFull]);
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const slugMaps = useMemo(
    () => Object.fromEntries(clubs.map(({ clubId, tournaments }) => [clubId, buildSlugMap(tournaments)])),
    [clubs]
  );

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const slashIdx = hash.indexOf('/');
    if (slashIdx > 0) {
      const clubId = hash.slice(0, slashIdx);
      const slug = hash.slice(slashIdx + 1);
      const id = slugMaps[clubId]?.slugToId?.[slug];
      if (id) { onSelectTournament(clubId, id); return; }
    }

    for (const { clubId } of clubs) {
      const id = slugMaps[clubId]?.slugToId?.[hash];
      if (id) { onSelectTournament(clubId, id); return; }
    }
  }, [loading, clubs, slugMaps]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleClub(clubId: string) {
    setHiddenClubs((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId); else next.add(clubId);
      return next;
    });
  }

  function toggleMode(mode: string) {
    setEnabledModes((prev) => {
      const next = new Set(prev);
      if (next.has(mode)) next.delete(mode); else next.add(mode);
      return next;
    });
  }

  const visibleClubs = clubs.filter((c) => !hiddenClubs.has(c.clubId));
  const hasAnyTournamentsAnywhere = clubs.some((c) => c.tournaments.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* App header */}
      <div
        style={{
          background: 'var(--white)',
          borderBottom: '1px solid var(--court-soft)',
          boxShadow: '0 2px 12px rgba(27,122,120,0.07)',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '18px clamp(12px,3vw,20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src={ballIcon}
              alt="Live Pickle"
              style={{
                width: 52, height: 52, borderRadius: '50%', objectFit: 'cover',
                flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 28,
                  fontWeight: 800,
                  color: 'var(--court)',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                }}
              >
                Live Pickle
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Tournament Directory
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={refresh}
              title="Refresh"
              style={{
                fontSize: 13, padding: '6px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(0,0,0,0.04)', color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              ↻
            </button>
            {user ? (
              <button
                onClick={onSignOut}
                title={user.email}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, padding: '6px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(0,0,0,0.04)', color: 'var(--muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />
                ) : '👤'}
                Sign out
              </button>
            ) : (
              <button
                onClick={onSignIn}
                style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                  background: 'var(--court-faint)', color: 'var(--court)',
                  border: '1px solid var(--court-soft)',
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px clamp(12px,3vw,20px)' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 15 }}>
            Loading tournaments…
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--red)', fontSize: 15 }}>
            {error}
            <br />
            <button
              onClick={refresh}
              style={{
                marginTop: 12, fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                background: 'var(--red-faint)', color: 'var(--red)',
                border: '1px solid var(--red-soft)',
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
              <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)', fontSize: 14 }}>
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
