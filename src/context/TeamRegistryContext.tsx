import { createContext, useContext } from 'react';
import { ALL_TEAMS } from '../constants';
import { playerDisplayName } from '../utils/nameDisplay';

export const TeamRegistryContext = createContext<{ registry: any[]; teamNameDisplay: string }>({
  registry: [],
  teamNameDisplay: 'name',
});

function useRegistry() {
  return useContext(TeamRegistryContext).registry;
}

// teamById for React components — reads from context so renames trigger re-renders
export function useTeamById() {
  const registry = useRegistry();
  return (id) => registry.find((t) => t.id === id) || ALL_TEAMS.find((t) => t.id === id);
}

function formatTeamLabel(team, mode) {
  if (!team) return '';
  const playerNames = (team.players || []).map(playerDisplayName).filter(Boolean).join(' & ');
  if (mode === 'players') return playerNames || team.name;
  if (mode === 'both') return playerNames ? `${team.name} (${playerNames})` : team.name;
  return team.name;
}

export function useTeamLabel() {
  const teamById = useTeamById();
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  return (teamId) => formatTeamLabel(teamById(teamId), teamNameDisplay);
}
