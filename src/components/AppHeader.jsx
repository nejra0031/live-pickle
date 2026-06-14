import { ROLES, ROLE_MAP } from '../roleConfig';
import ballIcon from '/ball.png';

const TABS = [['play', '🎾 Current round'], ['standings', '🏆 Standings'], ['matches', '📋 Matches']];

// Renders "📍 Location · 🗓 Sat Jun 13, 9:00 AM · ⏱ 4 hours" from whichever
// event-detail fields are set — any subset may be blank.
function formatEventInfo(location, startTime, durationMins) {
  const parts = [];
  if (location) parts.push(location);
  if (startTime) {
    const d = new Date(startTime);
    if (!isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      parts.push(`${dateStr}, ${timeStr}`);
    }
  }
  if (durationMins > 0) {
    const h = Math.floor(durationMins / 60), m = durationMins % 60;
    const durStr = h > 0 ? `${h} hour${h !== 1 ? 's' : ''}${m > 0 ? ` ${m} min` : ''}` : `${m} min`;
    parts.push(durStr);
  }
  return parts.join(' · ');
}

// Fixed top chrome: the floating "show header" pill (when hidden), the title bar
// with LIVE/role/presence/offline indicators, the login toggle, and the play-phase
// tab strip. Purely presentational — all state and actions are passed in.
export default function AppHeader({
  headerRef, headerHidden, onShowHeader, onHideHeader,
  tournamentTitle, tournamentLocation, tournamentStartTime, tournamentDurationMins,
  firebaseConnected, phase, role, presence, online,
  user, onSignIn, onSignOut, isOwner,
  onLoginToggle, activeTab, onTabChange,
  onBack,
}) {
  return (
    <>
      {headerHidden && (
        <button onClick={onShowHeader} style={{ position: 'fixed', top: 8, right: 8, zIndex: 50, padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: 'pointer', background: 'rgba(15,76,117,0.9)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>▼ Show header</button>
      )}

      <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: headerHidden ? 'none' : undefined }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(12px,3vw,20px)' }}>
          {onBack && (
            <div className="flex items-center" style={{ paddingTop: 6 }}>
              <button onClick={onBack} style={{ fontSize: 'clamp(10px,2.5vw,12px)', padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }}>
                ← Tournaments
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 py-3">
            <img src={ballIcon} alt="pickleball" style={{ width: 'clamp(36px,7vw,52px)', height: 'clamp(36px,7vw,52px)', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <h1 className="font-black tracking-tight leading-tight truncate" style={{ fontSize: 'clamp(16px,4vw,26px)', color: '#0f4c75' }}>{tournamentTitle}</h1>
              {(tournamentLocation || tournamentStartTime || tournamentDurationMins > 0) && (
                <p className="text-slate-500 truncate" style={{ fontSize: 'clamp(10px,2.5vw,12px)' }}>
                  {formatEventInfo(tournamentLocation, tournamentStartTime, tournamentDurationMins)}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {firebaseConnected && <span style={{ background: '#16a34a', color: '#fff', fontSize: 'clamp(8px,1.8vw,10px)', fontWeight: 800, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.06em' }}>LIVE</span>}
                {phase === 'play' && <span className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>{ROLE_MAP[role]?.title ?? 'Viewer'}</span>}
                {phase === 'setup' && <span className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>Setup</span>}
                {Object.values(presence).some(v => v > 0) && <span className="text-slate-400" style={{ fontSize: 'clamp(9px,2vw,11px)' }}>{[...ROLES.map(r => { const n = presence[r.id] ?? 0; return n > 0 ? `${n} ${r.title.toLowerCase()}${n !== 1 ? 's' : ''}` : null; }).filter(Boolean), `${presence.viewer ?? 0} viewer${(presence.viewer ?? 0) !== 1 ? 's' : ''}`].join(' · ')}</span>}
                {!online && <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#dc2626', fontWeight: 700 }}>● Offline</span>}
              </div>
            </div>
            {isOwner && (
              <span style={{ flexShrink: 0, alignSelf: 'center', fontSize: 'clamp(9px,2vw,11px)', fontWeight: 800, padding: '2px 6px', borderRadius: 6, background: 'rgba(15,76,117,0.08)', color: '#0f4c75' }}>Owner</span>
            )}
            <button onClick={onLoginToggle}
              style={{ flexShrink: 0, fontSize: 'clamp(10px,2.5vw,13px)', padding: '6px 10px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: ROLE_MAP[role]?.btnBg ?? 'rgba(0,0,0,0.06)', color: ROLE_MAP[role]?.btnColor ?? '#64748b', border: `1px solid ${ROLE_MAP[role]?.btnBorder ?? 'rgba(0,0,0,0.12)'}` }}>
              {role ? `${ROLE_MAP[role]?.icon ?? ''} ${ROLE_MAP[role]?.title ?? role}` : '🔒 Login'}
            </button>
            {user ? (
              <button onClick={onSignOut} title={`Signed in as ${user.email} · Sign out`}
                style={{ flexShrink: 0, padding: 0, borderRadius: '50%', cursor: 'pointer', border: 'none', background: 'transparent', lineHeight: 0 }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                  : <span style={{ fontSize: 18 }}>👤</span>}
              </button>
            ) : (
              <button onClick={onSignIn} title="Sign in with Google"
                style={{ flexShrink: 0, fontSize: 'clamp(10px,2.5vw,13px)', padding: '6px 8px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }}>
                Sign in
              </button>
            )}
            <button onClick={onHideHeader} title="Hide header"
              style={{ flexShrink: 0, fontSize: 13, padding: '6px 8px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#94a3b8', border: '1px solid rgba(0,0,0,0.08)' }}>▲</button>
          </div>
          {phase === 'play' && (
            <div className="flex gap-2 pb-2">
              {TABS.map(([id, label]) => (
                <button key={id} onClick={() => onTabChange(id)} className="flex-1 rounded-xl font-bold"
                  style={{ padding: 'clamp(6px,1.5vw,10px) 4px', fontSize: 'clamp(11px,2.5vw,14px)', background: activeTab === id ? 'linear-gradient(90deg,#0f4c75,#1a6fa8)' : 'rgba(0,0,0,0.05)', color: activeTab === id ? '#fff' : '#475569', cursor: 'pointer', border: activeTab === id ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
