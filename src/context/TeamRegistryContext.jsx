import React, { createContext, useContext } from 'react';
import { ALL_TEAMS } from '../constants';

export const TeamRegistryContext = createContext([]);

export function useRegistry() {
  return useContext(TeamRegistryContext);
}

// teamById for React components — reads from context so renames trigger re-renders
export function useTeamById() {
  const registry = useRegistry();
  return (id) => registry.find(t => t.id === id) || ALL_TEAMS.find(t => t.id === id);
}
