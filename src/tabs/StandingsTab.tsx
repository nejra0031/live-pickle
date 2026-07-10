import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';
import { ORDINAL } from '../constants';
import { chipStyle } from '../utils/chipStyle';

const RANK_COLOR = (i: number) =>
  i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#C97D3A' : 'rgba(0,0,0,0.1)';

interface Props { ranked: any[]; pausedIds?: string[] }
export default function StandingsTab({ ranked, pausedIds }: Props) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)' }}
    >
      {/* Column labels */}
      <div
        className="flex items-center"
        style={{
          padding: 'clamp(6px,1.5vw,9px) clamp(10px,2.5vw,18px)',
          borderLeft: '4px solid transparent',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          gap: 'clamp(6px,1.5vw,12px)',
        }}
      >
        <span style={{ width: 'clamp(36px,8vw,58px)', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>POS</span>
        <span className="flex-1" style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>PLAYER</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>GP</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>W</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>L</span>
        <span style={{ width: 'clamp(36px,7.5vw,54px)', textAlign: 'center', fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>+/-</span>
      </div>

      {ranked.map((team, i) => {
        const diff = team.scoreDiff, paused = (pausedIds || []).includes(team.id);
        const rankColor = RANK_COLOR(i);
        return (
          <div
            key={team.id}
            className="flex items-center"
            style={{
              padding: 'clamp(10px,2.5vw,16px) clamp(10px,2.5vw,18px)',
              gap: 'clamp(6px,1.5vw,12px)',
              background: 'var(--white)',
              borderTop: '1px solid var(--border)',
              borderLeft: `4px solid ${rankColor}`,
              opacity: paused ? 0.45 : 1,
            }}
          >
            <span
              style={{
                width: 'clamp(32px,7vw,54px)',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(16px,4vw,24px)',
                color: rankColor === 'rgba(0,0,0,0.1)' ? 'var(--muted)' : rankColor,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ORDINAL(i + 1)}
            </span>
            <div className="flex-1 min-w-0">
              <span
                style={{
                  ...chipStyle(teamById(team.id) ?? team),
                  fontSize: 'clamp(13px,3.5vw,20px)',
                  padding: 'clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)',
                }}
              >
                {teamLabel(team.id)}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                width: 'clamp(26px,5.5vw,42px)',
                textAlign: 'center',
                color: 'var(--muted)',
                fontSize: 'clamp(15px,3.5vw,20px)',
                fontWeight: 700,
              }}
            >
              {team.played}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                width: 'clamp(26px,5.5vw,42px)',
                textAlign: 'center',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: 'clamp(15px,3.5vw,20px)',
              }}
            >
              {team.wins}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                width: 'clamp(26px,5.5vw,42px)',
                textAlign: 'center',
                color: 'var(--ink)',
                fontWeight: 700,
                fontSize: 'clamp(15px,3.5vw,20px)',
              }}
            >
              {team.losses}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                width: 'clamp(36px,7.5vw,54px)',
                textAlign: 'center',
                fontWeight: 700,
                fontSize: 'clamp(15px,3.5vw,20px)',
                color: 'var(--ink)',
              }}
            >
              {diff > 0 ? '+' : ''}{diff}
            </span>
          </div>
        );
      })}
    </div>
  );
}
