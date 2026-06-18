import type { CSSProperties } from 'react';

export interface ChipTeam {
  color: string;
  text: string;
  chipBackground?: string;
}

// Consistent team chip style across all screens.
// won=true → solid team color (winner); won=false/undefined → grey bg with 6px left team-color border.
export function chipStyle(team: ChipTeam, won?: boolean): CSSProperties {
  const bg = team.chipBackground ?? team.color;
  const solid = won === true;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    fontWeight: 700,
    whiteSpace: 'nowrap',
    background: solid ? bg : 'rgba(0,0,0,0.04)',
    color: solid ? team.text : 'var(--ink)',
    border: `1px solid ${solid ? bg : 'rgba(0,0,0,0.08)'}`,
    borderLeft: `6px solid ${bg}`,
  };
}
