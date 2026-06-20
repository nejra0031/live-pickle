import React, { useEffect, useMemo, useRef, useState } from 'react';
import ballIcon from '/ball.png';
import { useAllClubs } from './hooks/useAllClubs';
import { TOURNAMENT_MODES, getSortTimestamp, isTournamentFull } from './landingFilters';
import ClubMembersPanel from './components/ClubMembersPanel';
import WelcomeScreen from './components/WelcomeScreen';

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

function TournamentCard({ t, onClick, onDelete, clubInfo }: { t: any; onClick: () => void; onDelete?: (id: string) => void; clubInfo?: any }) {
  const [confirming, setConfirming] = useState(false);
  const statusStyle = STATUS_STYLES[t.status] ?? STATUS_STYLES.finished;
  const modeLabel = MODE_LABELS[t.mode] ?? t.mode ?? '';
  const isActive = t.status === 'active';
  const isSetup = t.status === 'setup';
  const now = Date.now();
  const isOngoing = isActive && (!t.startTime || new Date(t.startTime).getTime() <= now);
  const isRegistrationOpen = isSetup;

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
          {clubInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
              <img
                src={clubInfo.imageUrl || ballIcon}
                alt=""
                style={{ width: 15, height: 15, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.02em' }}>
                {clubInfo.name}
              </span>
            </div>
          )}
          {(isOngoing || isRegistrationOpen) && (
            <div style={{ marginBottom: 5 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: isOngoing ? '#16a34a' : '#b45309',
                  background: isOngoing ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
                  padding: '2px 7px',
                  borderRadius: 4,
                  border: `1px solid ${isOngoing ? 'rgba(22,163,74,0.25)' : 'rgba(217,119,6,0.25)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 7, lineHeight: 1 }}>●</span>
                {isOngoing ? 'Ongoing' : 'Registration open'}
              </span>
            </div>
          )}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: isOngoing || isRegistrationOpen ? 'clamp(19px,4.5vw,26px)' : 'clamp(15px,4vw,19px)',
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
            {!isOngoing && !isRegistrationOpen && (
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
            )}
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
            const placeLabels = ['2nd', '1st', '3rd'];
            const barH = [22, 30, 16];
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
                    background: 'var(--court)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '0.02em',
                  }}
                >
                  {placeLabels[i]}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CheckItem({ checked, label, logoUrl, onClick }: {
  checked: boolean; label: string; logoUrl?: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0',
        fontSize: 13, fontWeight: 600,
        color: checked ? 'var(--ink)' : 'var(--muted)',
      }}
    >
      <span style={{
        width: 15, height: 15, borderRadius: 3, flexShrink: 0,
        background: checked ? 'var(--court)' : 'transparent',
        border: checked ? 'none' : '1.5px solid rgba(0,0,0,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
      }}>
        {checked && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {logoUrl && (
        <img src={logoUrl} alt="" style={{ width: 17, height: 17, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      )}
      <span>{label}</span>
    </button>
  );
}

function FilterSection({ clubs, hiddenClubs, onToggleClub, enabledModes, onToggleMode, hideFull, onToggleHideFull, hasMultipleClubs, hasTournaments }: {
  clubs: any[]; hiddenClubs: Set<string>; onToggleClub: (id: string) => void;
  enabledModes: Set<string>; onToggleMode: (m: string) => void;
  hideFull: boolean; onToggleHideFull: () => void;
  hasMultipleClubs: boolean; hasTournaments: boolean;
}) {
  const rowLabel = (text: string) => (
    <span style={{
      fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: '0.09em', width: 46, flexShrink: 0, paddingTop: 4,
    }}>
      {text}
    </span>
  );
  return (
    <div style={{
      marginBottom: 20,
      padding: '12px 14px',
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {hasMultipleClubs && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {rowLabel('Clubs')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, rowGap: 4 }}>
            {clubs.map(({ clubId, clubInfo }: { clubId: string; clubInfo: any }) => (
              <CheckItem
                key={clubId}
                checked={!hiddenClubs.has(clubId)}
                label={clubInfo?.name ?? clubId}
                logoUrl={clubInfo?.imageUrl || ballIcon}
                onClick={() => onToggleClub(clubId)}
              />
            ))}
          </div>
        </div>
      )}
      {hasTournaments && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {rowLabel('Format')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, rowGap: 4 }}>
            {TOURNAMENT_MODES.map((mode) => (
              <CheckItem
                key={mode}
                checked={enabledModes.has(mode)}
                label={MODE_LABELS[mode]}
                onClick={() => onToggleMode(mode)}
              />
            ))}
            <CheckItem checked={hideFull} label="Hide full" onClick={onToggleHideFull} />
          </div>
        </div>
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
  joinedClubIds?: string[];
  myClubsLoading?: boolean;
  onCreateClub: (name: string) => Promise<any>;
  onJoinClubs: (clubIds: string[]) => Promise<void>;
}
export default function LandingPage({
  onSelectTournament,
  onCreateTournament,
  user,
  onSignIn,
  onSignOut,
  ownedClubIds = [],
  joinedClubIds = [],
  myClubsLoading = false,
  onCreateClub,
  onJoinClubs,
}: LandingPageProps) {
  const { clubs, loading, error, refresh, deleteTournament } = useAllClubs();

  const [hiddenClubs, setHiddenClubs] = useState<Set<string>>(
    () => new Set(readStoredJSON(LS_KEYS.hiddenClubs, []))
  );
  const [membersClubId, setMembersClubId] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeCheckedRef = useRef(false);
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

  // Reset welcome check when user changes
  useEffect(() => {
    welcomeCheckedRef.current = false;
    setShowWelcome(false);
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show welcome screen for logged-in users who haven't joined any clubs yet
  useEffect(() => {
    if (!user || myClubsLoading || welcomeCheckedRef.current) return;
    welcomeCheckedRef.current = true;
    if (joinedClubIds.length === 0 && ownedClubIds.length === 0) {
      setShowWelcome(true);
    }
  }, [user, myClubsLoading, joinedClubIds, ownedClubIds]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleWelcomeDone(selectedClubIds: string[]) {
    await onJoinClubs(selectedClubIds);
    setShowWelcome(false);
  }

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

  // When logged in, show only clubs the user owns or has joined
  const memberClubs = user
    ? clubs.filter(
        (c) => ownedClubIds.includes(c.clubId) || joinedClubIds.includes(c.clubId)
      )
    : clubs;

  const hasAnyTournamentsAnywhere = memberClubs.some((c) => c.tournaments.length > 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* App header */}
      <div
        style={{
          background: 'var(--court)',
          borderBottom: '3px solid var(--ball)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '0 clamp(12px,3vw,20px)',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src={ballIcon}
              alt="Live Pickle"
              style={{
                width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
                flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
              }}
            />
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px,6vw,36px)',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.3px',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: 'var(--ball)' }}>Live</span>
              {' '}
              <span style={{ color: '#fff' }}>Pickle</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <button
                onClick={onSignOut}
                title={user.email}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 13, padding: '6px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255,255,255,0.18)',
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
                  fontSize: 13, padding: '6px 14px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                  background: 'var(--ball)', color: 'var(--ink)',
                  border: 'none',
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

        {!loading && !error && (() => {
          const now = Date.now();
          const modeFilterActive = enabledModes.size < TOURNAMENT_MODES.length;

          // Flat list of all tournaments across all visible member clubs
          const allWithClub = memberClubs.flatMap(({ clubId, clubInfo, tournaments }) =>
            (hiddenClubs.has(clubId) ? [] : tournaments).map((t: any) => ({ ...t, _clubId: clubId, _clubInfo: clubInfo }))
          );

          const filtered = allWithClub.filter((t: any) => {
            if (modeFilterActive && !enabledModes.has(t.mode)) return false;
            if (hideFull && t.status !== 'finished' && isTournamentFull(t)) return false;
            return true;
          });

          const ongoing = filtered.filter((t: any) =>
            t.status === 'active' && (!t.startTime || new Date(t.startTime).getTime() <= now)
          );
          const regOpen = filtered.filter((t: any) =>
            t.status === 'setup' || (t.status === 'active' && t.startTime && new Date(t.startTime).getTime() > now)
          );
          const finished = filtered.filter((t: any) => t.status === 'finished');

          const byDate = (dir: 1 | -1) => (a: any, b: any) => {
            const ta = getSortTimestamp(a), tb = getSortTimestamp(b);
            if (ta == null && tb == null) return 0;
            if (ta == null) return 1;
            if (tb == null) return -1;
            return dir * (ta - tb);
          };

          const groups = [
            { label: 'In progress', items: [...ongoing].sort(byDate(1)) },
            { label: 'Registration open', items: [...regOpen].sort(byDate(1)) },
            { label: 'Finished', items: [...finished].sort(byDate(-1)) },
          ];

          function handleCardClick(t: any) {
            const slug = slugMaps[t._clubId]?.idToSlug?.[t.id] || t.id;
            history.pushState({ clubId: t._clubId, tournamentId: t.id }, '', `#${t._clubId}/${slug}`);
            onSelectTournament(t._clubId, t.id);
          }

          const ownedClubs = memberClubs.filter(({ clubId }) => ownedClubIds.includes(clubId));

          return (
            <>
              {/* Owner admin row */}
              {user && (
                <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <NewClubForm onCreateClub={onCreateClub} />
                  {ownedClubs.map(({ clubId, clubInfo }) => (
                    <React.Fragment key={clubId}>
                      <span style={{ color: 'var(--border)', userSelect: 'none' }}>|</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img
                          src={(clubInfo as any)?.imageUrl || ballIcon}
                          alt=""
                          style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                          {(clubInfo as any)?.name ?? clubId}
                        </span>
                        <button
                          onClick={() => setMembersClubId(clubId)}
                          style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                            background: 'var(--court-faint)', color: 'var(--court)',
                            border: '1px solid var(--court-soft)',
                          }}
                        >
                          Members
                        </button>
                        <button
                          onClick={() => onCreateTournament(clubId)}
                          style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer',
                            background: 'var(--court)', color: '#fff', border: 'none',
                          }}
                        >
                          + Tournament
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Filters */}
              {(memberClubs.length > 1 || hasAnyTournamentsAnywhere) && (
                <FilterSection
                  clubs={memberClubs}
                  hiddenClubs={hiddenClubs}
                  onToggleClub={toggleClub}
                  enabledModes={enabledModes}
                  onToggleMode={toggleMode}
                  hideFull={hideFull}
                  onToggleHideFull={() => setHideFull((v) => !v)}
                  hasMultipleClubs={memberClubs.length > 1}
                  hasTournaments={hasAnyTournamentsAnywhere}
                />
              )}

              {/* Flat tournament list */}
              {memberClubs.length > 0 && memberClubs.every(({ clubId }) => hiddenClubs.has(clubId)) ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)', fontSize: 14 }}>
                  All clubs hidden — uncheck a club above to show it
                </div>
              ) : groups.every((g) => g.items.length === 0) ? (
                memberClubs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--muted)' }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🎾</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>No clubs yet</div>
                    {user && (
                      <div style={{ fontSize: 13, marginTop: 6 }}>
                        Use <strong>+ New Club</strong> above to get started
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)', fontSize: 14 }}>
                    No tournaments match the current filters
                  </div>
                )
              ) : (
                groups.map(({ label, items }) =>
                  items.length === 0 ? null : (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <div className="section-label">{label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                        {items.map((t: any) => (
                          <TournamentCard
                            key={`${t._clubId}/${t.id}`}
                            t={t}
                            onClick={() => handleCardClick(t)}
                            onDelete={ownedClubIds.includes(t._clubId) ? (tid: string) => deleteTournament(t._clubId, tid) : undefined}
                            clubInfo={t._clubInfo}
                          />
                        ))}
                      </div>
                    </div>
                  )
                )
              )}
            </>
          );
        })()}
      </div>

      {membersClubId && (
        <ClubMembersPanel clubId={membersClubId} onClose={() => setMembersClubId(null)} />
      )}

      {showWelcome && (
        <WelcomeScreen
          user={user}
          clubs={clubs}
          clubsLoading={loading}
          onDone={handleWelcomeDone}
        />
      )}
    </div>
  );
}
