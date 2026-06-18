import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';
import { chipStyle } from '../utils/chipStyle';

export default function TeamChip({ teamId }: { teamId: string }) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const t = teamById(teamId);
  if (!t) return null;
  return (
    <span style={{ ...chipStyle(t), fontSize: 'clamp(11px,3vw,14px)', padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)' }}>
      {teamLabel(teamId)}
    </span>
  );
}
