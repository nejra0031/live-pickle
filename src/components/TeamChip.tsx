import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';

export default function TeamChip({ teamId }: { teamId: string }) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const t = teamById(teamId);
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
      style={{ background: t.color, color: t.text, border: '2px solid rgba(255,255,255,0.15)' }}
    >
      {teamLabel(teamId)}
    </span>
  );
}
