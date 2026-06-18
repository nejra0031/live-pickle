import React from 'react';

// Shared "no result yet" matchup display — two chip-styled team blocks either
// side of a "VS" divider. `compact` shrinks sizing for TPT/DoublesRR layouts.
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
  const accentSize = compact ? 6 : 8;

  const Side = ({ team, dim }: { team: any; dim: boolean }) => {
    const bg = team.chipBackground ?? team.color;
    return (
      <div
        className={`flex-1 flex items-center justify-center ${borderRadius} overflow-hidden`}
        style={{
          padding: boxPadding,
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderLeft: `${accentSize}px solid ${bg}`,
          opacity: dim ? 0.4 : 1,
        }}
      >
        <span
          className="font-black text-center leading-tight"
          style={{ fontSize: nameFontSize, color: 'var(--ink)' }}
        >
          {team.name}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
      {(courtLabel || headerExtra) && (
        <div className="flex items-center gap-2">
          {courtLabel && (
            <p
              style={{
                fontSize: 'clamp(10px,2.5vw,13px)',
                color: 'var(--court)',
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
