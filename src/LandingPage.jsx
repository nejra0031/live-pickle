import { useEffect } from 'react';
import ballIcon from '/ball.png';
import { DEFAULT_CLUB_ID } from './firebase';
import { useClubs } from './hooks/useClubs';

const CLUB_ID = DEFAULT_CLUB_ID;

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

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function TournamentCard({ t, onClick }) {
  const statusStyle = STATUS_STYLES[t.status] ?? STATUS_STYLES.finished;
  const modeLabel = MODE_LABELS[t.mode] ?? t.mode ?? '';
  return (
    <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,76,117,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
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
            {t.teamCount > 0 && (
              <span style={{ color: '#64748b', fontSize: 12 }}>
                {t.teamCount} {t.mode === 'tpt' || t.mode === 'doublesrr' ? 'players' : 'teams'}
              </span>
            )}
          </div>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>{formatDate(t.createdAt)}</div>
          <div style={{ marginTop: 8, color: '#0f4c75', fontWeight: 700, fontSize: 13 }}>Open →</div>
        </div>
      </div>
    </button>
  );
}

export default function LandingPage({ onSelectTournament, onCreateTournament, viewerOnly = false }) {
  const { clubInfo, tournaments, loading, error, refresh } = useClubs(CLUB_ID);

  // Refresh whenever the landing page mounts (e.g. after creating a tournament)
  useEffect(() => { refresh(); }, []);

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
                onClick={() => onSelectTournament(CLUB_ID, t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
