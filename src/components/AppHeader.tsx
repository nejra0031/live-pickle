import React from 'react';
import { ROLES, ROLE_MAP } from '../roleConfig';
import type { RoleId } from '../types';
import ballIcon from '/ball.png';

const TABS = [
  ['play', 'Round'],
  ['standings', 'Standings'],
  ['matches', 'Matches'],
];

function formatEventInfo(location: string, startTime: string, durationMins: number) {
  const parts: string[] = [];
  if (location) parts.push(location);
  if (startTime) {
    const d = new Date(startTime);
    if (!isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
      });
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

export default function AppHeader({
  headerRef,
  headerHidden,
  onShowHeader,
  onHideHeader,
  tournamentTitle,
  tournamentLocation,
  tournamentStartTime,
  tournamentDurationMins,
  firebaseConnected,
  phase,
  role,
  presence,
  online,
  user,
  isOwner,
  onLoginToggle,
  activeTab,
  onTabChange,
  onBack,
  showNoPinWarning,
  onOpenSettings,
}: {
  headerRef: React.RefObject<HTMLDivElement | null>;
  headerHidden: boolean;
  onShowHeader: () => void;
  onHideHeader: () => void;
  tournamentTitle: string;
  tournamentLocation: string;
  tournamentStartTime: string;
  tournamentDurationMins: number;
  firebaseConnected: boolean;
  phase: string;
  role: string | null;
  presence: Record<string, number>;
  online: boolean;
  user: any;
  isOwner: boolean;
  onLoginToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBack?: (() => void) | null;
  showNoPinWarning?: boolean;
  onOpenSettings?: () => void;
}) {
  const eventInfo = formatEventInfo(tournamentLocation, tournamentStartTime, tournamentDurationMins);

  const presenceParts = [
    ...ROLES.map((r) => {
      const n = (presence[r.id] as number) ?? 0;
      return n > 0 ? `${n} ${r.title.toLowerCase()}${n !== 1 ? 's' : ''}` : null;
    }).filter(Boolean),
    `${(presence.viewer as number) ?? 0} viewer${((presence.viewer as number) ?? 0) !== 1 ? 's' : ''}`,
  ];

  const roleLabel = ROLE_MAP[role as RoleId]?.title ?? (phase === 'setup' ? 'Setup' : 'Viewer');

  const statusParts: string[] = [...presenceParts].filter(Boolean) as string[];

  const toggleBtnBase: React.CSSProperties = {
    width: 32,
    height: 32,
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.06)',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };

  return (
    <>
      <div
        ref={headerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--white)',
          borderBottom: '1px solid var(--court-soft)',
          boxShadow: '0 2px 12px rgba(27,122,120,0.08)',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(12px,3vw,20px)' }}>

          {/* Nav strip: back link (left) + auth controls (right) */}
          <div
            className="flex items-center justify-between"
            style={{ paddingTop: 8, paddingBottom: 4, gap: 8 }}
          >
            {onBack ? (
              <button
                onClick={onBack}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--muted)',
                  fontSize: 'clamp(10px,2.5vw,12px)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ← Tournaments
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center" style={{ gap: 6, flexShrink: 0 }}>
              {user && (
                <button
                  onClick={onLoginToggle}
                  title={`${user.email} · Manage access`}
                  style={{
                    padding: 0,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2px solid var(--court-soft)',
                    background: 'transparent',
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" style={{ width: 22, height: 22, borderRadius: '50%', display: 'block' }} />
                  ) : (
                    <span style={{ fontSize: 16, display: 'block', width: 22, height: 22, lineHeight: '22px', textAlign: 'center' }}>👤</span>
                  )}
                </button>
              )}
              <button
                onClick={onLoginToggle}
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 10px',
                  fontSize: 'clamp(10px,2.5vw,12px)',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: ROLE_MAP[role as RoleId]?.btnBg ?? 'rgba(0,0,0,0.06)',
                  color: ROLE_MAP[role as RoleId]?.btnColor ?? 'var(--muted)',
                  border: `1px solid ${ROLE_MAP[role as RoleId]?.btnBorder ?? 'rgba(0,0,0,0.12)'}`,
                  flexShrink: 0,
                }}
              >
                {role ? `${ROLE_MAP[role as RoleId]?.icon ?? ''} ${ROLE_MAP[role as RoleId]?.title ?? role}` : '🔒 Login'}
              </button>
              <button
                onClick={headerHidden ? onShowHeader : onHideHeader}
                title={headerHidden ? 'Show header' : 'Hide header'}
                style={toggleBtnBase}
              >
                {headerHidden ? '▼' : '▲'}
              </button>
            </div>
          </div>

          {!headerHidden && <div className="flex items-center" style={{ gap: 10, paddingBottom: 3 }}>
            <img
              src={ballIcon}
              alt=""
              style={{
                width: 'clamp(28px,5.5vw,38px)',
                height: 'clamp(28px,5.5vw,38px)',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <h1
              className="leading-tight truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(20px,5.5vw,32px)',
                color: 'var(--ink)',
                letterSpacing: '-0.3px',
                margin: 0,
                flex: 1,
                minWidth: 0,
              }}
            >
              {tournamentTitle}
            </h1>
            {isOwner && (
              <span
                style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(9px,2vw,11px)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--court)',
                }}
              >
                Owner
              </span>
            )}
            {firebaseConnected ? (
              <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#16a34a',
                    fontSize: 'clamp(9px,2vw,11px)',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span className="live-dot">●</span>
                  {' LIVE'}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 'clamp(9px,2vw,11px)', fontWeight: 400, userSelect: 'none' }}>·</span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(9px,2vw,11px)',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  {roleLabel}
                </span>
              </div>
            ) : !online ? (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: 'var(--red)',
                  fontWeight: 700,
                }}
              >
                ● Offline
              </span>
            ) : null}
          </div>}

          {!headerHidden && <>
            {/* Meta rows */}
            <div style={{ paddingBottom: 8 }}>
              {eventInfo && (
                <p
                  className="truncate"
                  style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}
                >
                  {eventInfo}
                </p>
              )}
              {statusParts.length > 0 && (
                <p
                  className="truncate"
                  style={{ fontSize: 'clamp(9px,2vw,11px)', color: 'var(--muted)', margin: 0, lineHeight: 1.4, opacity: 0.75 }}
                >
                  {statusParts.join(' · ')}
                </p>
              )}
            </div>

            {/* Tab strip */}
            {phase === 'play' && (
              <div
                className="flex"
                style={{ borderBottom: '2px solid var(--border)', marginLeft: -2, marginRight: -2 }}
              >
                {TABS.map(([id, label]) => {
                  const isActive = activeTab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => onTabChange(id)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: isActive ? '4px solid var(--ball)' : '4px solid transparent',
                        marginBottom: -2,
                        borderRadius: 0,
                        padding: 'clamp(7px,1.8vw,11px) 4px',
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(14px,3.2vw,18px)',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: isActive ? 'var(--ink)' : 'var(--muted)',
                        cursor: 'pointer',
                        transition: 'color 0.12s',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </>}
        </div>

        {/* No-PIN warning — shown below the inner padding so it spans the full header width */}
        {showNoPinWarning && !headerHidden && (
          <div
            style={{
              background: '#fefce8',
              borderTop: '1px solid #fde68a',
              padding: '7px clamp(12px,3vw,20px)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', flex: 1, minWidth: 0 }}>
              ⚠ No admin PIN set — actions like cancelling a round or resetting require one.
            </span>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: '#fde68a',
                  color: '#78350f',
                  border: '1px solid #fbbf24',
                }}
              >
                Open Settings
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
