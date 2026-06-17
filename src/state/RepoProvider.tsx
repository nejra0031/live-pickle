import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { TournamentRepo } from '../firebase';

const RepoCtx = createContext<TournamentRepo | null>(null);

export function RepoProvider({ repo, children }: { repo: TournamentRepo; children: ReactNode }) {
  return <RepoCtx.Provider value={repo}>{children}</RepoCtx.Provider>;
}

export function useRepo(): TournamentRepo {
  const repo = useContext(RepoCtx);
  if (!repo) throw new Error('useRepo must be used within RepoProvider');
  return repo;
}
