import React from 'react';

// Shared "no result yet" matchup display — a large colored box per side either
// side of a "VS" divider. Gradient-aware: prefers `team.chipBackground` (e.g. a
// Doubles RR side with two differently-colored players) over the solid `team.color`.
// `compact` shrinks the sizing for denser per-game/per-court layouts (TPT, Doubles RR).
export default function MatchupVsBox({
  courtLabel,
  teamA,
  teamB,
  compact = false,
  dimA = false,
  dimB = false,
  headerExtra = null,
}: {
  courtLabel?: any;
  teamA: any;
  teamB: any;
  compact?: boolean;
  dimA?: boolean;
  dimB?: boolean;
  headerExtra?: React.ReactNode;
}) {
  const boxPadding = compact
    ? 'clamp(10px,2.5vw,16px)'
    : 'clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)';
  const nameFontSize = compact ? 'clamp(14px,3.5vw,22px)' : 'clamp(18px,5vw,36px)';
  const vsFontSize = compact ? 'clamp(12px,3vw,18px)' : 'clamp(14px,3.5vw,22px)';
  const borderRadius = compact ? 'rounded-xl' : 'rounded-2xl';

  const Side = ({ team, dim }: { team: any; dim: boolean }) => (
    <div
      className={`flex-1 flex items-center justify-center ${borderRadius}`}
      style={{
        padding: boxPadding,
        background: team.chipBackground ?? team.color,
        border: `2px solid ${team.color}`,
        opacity: dim ? 0.4 : 1,
      }}
    >
      <span
        className="font-black text-center leading-tight"
        style={{ fontSize: nameFontSize, color: team.text }}
      >
        {team.name}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
      {(courtLabel || headerExtra) && (
        <div className="flex items-center gap-2">
          {courtLabel && (
            <p
              style={{
                fontSize: 'clamp(10px,2.5vw,13px)',
                color: '#0f4c75',
                fontWeight: 800,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {courtLabel}
            </p>
          )}
          {headerExtra}
        </div>
      )}
      <div className="flex items-stretch" style={{ gap: 'clamp(8px,2vw,14px)' }}>
        <Side team={teamA} dim={dimA} />
        <div className="flex items-center justify-center flex-shrink-0">
          <span style={{ color: '#cbd5e1', fontWeight: 900, fontSize: vsFontSize }}>VS</span>
        </div>
        <Side team={teamB} dim={dimB} />
      </div>
    </div>
  );
}
