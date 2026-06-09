import { useEffect, useMemo, useState } from 'react';
import ballIcon from '/ball.png';
import { DEFAULT_CLUB_ID } from './firebase';
import { useClubs } from './hooks/useClubs';

const CLUB_ID = DEFAULT_CLUB_ID;

function toSlug(title) {
  return (title || 'tournament')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tournament';
}

function buildSlugMap(tournaments) {
  const slugCount = {};
  tournaments.forEach(t => { const s = toSlug(t.title); slugCount[s] = (slugCount[s] || 0) + 1; });
  const idToSlug = {}, slugToId = {};
  tournaments.forEach(t => {
    const base = toSlug(t.title);
    const slug = slugCount[base] > 1 ? `${base}-${t.id.slice(0, 6)}` : base;
    idToSlug[t.id] = slug;
    slugToId[slug] = t.id;
  });
  return { idToSlug, slugToId };
}

const MODE_LABELS = {
  swiss:      'Swiss',
  roundrobin: 'Round Robin',
  tpt:        'Trio Teams',
  doublesrr:  'Doubles RR',
};

const STATUS_STYLES = {
  active:   { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
  setup:    { bg: '#fef9c3', color: '#ca8a04', label: 'Setup' },
  finished: { bg: '#f1f5f9', color: '#64748b', label: 'Finished' },
};

function formatStartTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

function TournamentCard({ t, onClick, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const statusStyle = STATUS_STYLES[t.status] ?? STATUS_STYLES.finished;
  const modeLabel = MODE_LABELS[t.mode] ?? t.mode ?? '';
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s', boxSizing: 'border-box' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,76,117,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>

      {/* Top row: title + meta on left, delete button on right */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.title || 'Untitled Tournament'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {modeLabel && (
              <span style={{ background: 'rgba(15,76,117,0.08)', color: '#0f4c75', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                {modeLabel}
              </span>
            )}
            <span style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
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
              {t.startTime && <span style={{ color: '#475569', fontSize: 12 }}>{formatStartTime(t.startTime)}</span>}
              {t.location  && <span style={{ color: '#64748b',  fontSize: 12 }}>📍 {t.location}</span>}
            </div>
          )}
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          {confirming ? (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>Delete?</span>
              <button onClick={() => onDelete(t.id)}
                style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: '#dc2626', color: '#fff', border: 'none' }}>
                Yes
              </button>
              <button onClick={() => setConfirming(false)}
                style={{ fontSize: 12, padding: '3px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.06)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 }}>
              <div style={{ color: '#0f4c75', fontWeight: 700, fontSize: 13 }}>Open →</div>
              {onDelete && (
                <button onClick={e => { e.stopPropagation(); setConfirming(true); }}
                  title="Delete tournament"
                  style={{ fontSize: 13, lineHeight: 1, padding: '3px 7px', borderRadius: 7, fontWeight: 700, cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}>
                  ×
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mini podium for finished tournaments */}
      {t.status === 'finished' && t.top3?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'flex-end' }}>
          {[t.top3[1], t.top3[0], t.top3[2]].map((entry, i) => {
            if (!entry) return <div key={i} style={{ flex: '1 1 0' }} />;
            const medals = ['🥈', '🥇', '🥉'];
            const barH   = [22, 30, 16];
            const barBg  = i === 1 ? 'linear-gradient(180deg,#fbbf24,#d97706)' : i === 0 ? 'linear-gradient(180deg,#cbd5e1,#94a3b8)' : 'linear-gradient(180deg,#f59e42,#b45309)';
            return (
              <div key={i} style={{ flex: '1 1 0', maxWidth: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 14 }}>{medals[i]}</span>
                <span style={{ background: entry.color, color: entry.text, fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }}>
                  {entry.name}
                </span>
                <div style={{ width: '100%', height: barH[i], borderRadius: '4px 4px 0 0', background: barBg }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LandingPage({ onSelectTournament, onCreateTournament, viewerOnly = false }) {
  const { clubInfo, tournaments, loading, error, refresh, deleteTournament } = useClubs(CLUB_ID);

  const { idToSlug, slugToId } = useMemo(() => buildSlugMap(tournaments), [tournaments]);

  // Refresh whenever the landing page mounts (e.g. after creating a tournament)
  useEffect(() => { refresh(); }, []);

  // Auto-navigate to tournament from URL hash on initial load
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const id = slugToId[hash];
    if (id) onSelectTournament(CLUB_ID, id);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Club header */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px clamp(12px,3vw,20px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <img src={ballIcon} alt="club logo" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f4c75', letterSpacing: '-0.5px' }}>
                {clubInfo?.name ?? 'BLUE'}
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>Pickleball Club</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px clamp(12px,3vw,20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>Tournaments</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={refresh} title="Refresh" style={{ fontSize: 13, padding: '6px 12px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }}>
              ↻ Refresh
            </button>
            {!viewerOnly && (
              <button onClick={() => onCreateTournament(CLUB_ID)} style={{ fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(90deg,#0f4c75,#1a6fa8)', color: '#fff', border: 'none', boxShadow: '0 2px 6px rgba(15,76,117,0.3)' }}>
                + New Tournament
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8', fontSize: 15 }}>
            Loading tournaments...
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#dc2626', fontSize: 15 }}>
            {error}
            <br />
            <button onClick={refresh} style={{ marginTop: 12, fontSize: 13, padding: '6px 16px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>Try again</button>
          </div>
        )}

        {!loading && !error && tournaments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>No tournaments yet</div>
            {!viewerOnly && (
              <div style={{ fontSize: 14 }}>Click <strong>+ New Tournament</strong> to get started</div>
            )}
          </div>
        )}

        {!loading && !error && tournaments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tournaments.map(t => (
              <TournamentCard
                key={t.id}
                t={t}
                onClick={() => {
                  const slug = idToSlug[t.id] || t.id;
                  history.pushState({ clubId: CLUB_ID, tournamentId: t.id }, '', `#${slug}`);
                  onSelectTournament(CLUB_ID, t.id);
                }}
                onDelete={!viewerOnly ? deleteTournament : null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
