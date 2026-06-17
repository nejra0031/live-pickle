import { useCallback } from 'react';
import { rebuildStandings } from '../algorithms/standings';
import { generateRoundRobinSchedule } from '../algorithms/roundRobin';
import { reindexPendingAfterRemoval } from '../pending';
import { courtKey } from '../constants';
import { setModuleRegistry } from '../constants';
import { writeTournamentMeta } from '../firebase';
import { hasPermission } from '../roleConfig';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useRepo } from '../state/RepoProvider';

export function useCourtManagement({
  clubId,
  tournamentIdRef,
  gatedUpdate,
  setStandings,
  onFirebaseError,
  pendingRef,
  roleRef,
}: {
  clubId: string | null;
  tournamentIdRef: import('react').MutableRefObject<string | null>;
  gatedUpdate: (perm: any, fields: any) => void;
  setStandings: (s: any[]) => void;
  onFirebaseError: (msg: string) => void;
  pendingRef: import('react').MutableRefObject<Record<string, any>>;
  roleRef: import('react').MutableRefObject<string | null>;
}) {
  const { set, stateRef } = useTournamentState();
  const { modal, closeModal } = useModal();
  const repo = useRepo();

  const handleManageTeamsSave = useCallback(
    (newRegistry: any[], newActiveIds: string[]) => {
      const s = stateRef.current;
      set('tournamentTeams', newRegistry);
      setModuleRegistry(newRegistry);
      set('activeTeamIds', newActiveIds);
      setStandings(rebuildStandings(newActiveIds, s.history));
      closeModal();
      const upd: Record<string, any> = { teamRegistry: newRegistry, activeTeamIds: newActiveIds };
      if (s.tournamentMode === 'roundrobin' && s.history.length === 0) {
        const schedule = generateRoundRobinSchedule(newActiveIds, s.courtNumbers.length);
        set('roundRobinSchedule', schedule);
        upd.roundRobinSchedule = schedule;
      }
      gatedUpdate('canEditTeams', upd);
      if (clubId && tournamentIdRef.current)
        writeTournamentMeta(clubId, tournamentIdRef.current, {
          playerCount: newRegistry.reduce((n: number, t: any) => n + (t.players?.length || 1), 0),
        });
    },
    [stateRef, set, gatedUpdate, setStandings, closeModal, clubId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleTeamNameDisplayChange = useCallback(
    (mode: string) => {
      set('teamNameDisplay', mode as any);
      gatedUpdate('canEditTeams', { teamNameDisplay: mode });
    },
    [set, gatedUpdate]
  );

  const handleManageCourtsSave = useCallback(
    (newCourts: string[], newSocialCourts: string[]) => {
      const s = stateRef.current;
      const upd: Record<string, any> = { courtNumbers: newCourts, socialCourts: newSocialCourts };
      if (s.round) {
        const prevSocialSet = new Set(s.socialCourts.map(String));
        const newlySocial = new Set(
          newSocialCourts.filter((c: string) => !prevSocialSet.has(String(c))).map(String)
        );
        if (newlySocial.size > 0) {
          const currentNums = s.round.courtNums || s.courtNumbers;
          const newRoundCourts: any[] = [],
            newRoundNums: any[] = [],
            extraBye: any[] = [];
          const removedIndices = new Set<number>();
          currentNums.forEach((cn, i) => {
            if (newlySocial.has(String(cn))) {
              extraBye.push(...(s.round!.courts[i] || []));
              removedIndices.add(i);
            } else {
              newRoundCourts.push(s.round!.courts[i]);
              newRoundNums.push(cn);
            }
          });
          if (removedIndices.size > 0) {
            const newBye = [...(s.round.bye || []), ...extraBye];
            set('round', {
              ...s.round,
              courts: newRoundCourts,
              courtNums: newRoundNums,
              bye: newBye,
            });
            const np = reindexPendingAfterRemoval(pendingRef.current, 'court_', removedIndices);
            pendingRef.current = np;
            set('pending', np);
            if (hasPermission(roleRef.current as any, 'canEditCourts')) {
              upd.roundData = {
                courtTeamIds: newRoundCourts.map((p: any[]) => p.map((t: any) => t.id)),
                byeIds: newBye.map((t) => t.id),
                pausedTeamIds: (s.round.paused || []).map((t) => t.id),
                courtNums: newRoundNums,
              };
              upd.pendingResults = np;
            }
          }
        }
      }
      if (s.tournamentMode === 'roundrobin' && s.roundRobinCourts) {
        const newCourtsSet = new Set(newCourts);
        const mapped = s.roundRobinCourts
          .map((old) => {
            const i = s.courtNumbers.indexOf(old);
            return i >= 0 && i < newCourts.length ? newCourts[i] : old;
          })
          .filter((c) => newCourtsSet.has(c));
        set('roundRobinCourts', mapped);
        upd.roundRobinCourts = mapped;
      }
      set('courtNumbers', newCourts);
      set('socialCourts', newSocialCourts);
      closeModal();
      gatedUpdate('canEditCourts', upd);
    },
    [stateRef, pendingRef, roleRef, set, gatedUpdate, closeModal]
  );

  const handleTogglePause = useCallback(
    (id: string) => {
      const prev = stateRef.current.pausedIds;
      const np = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      set('pausedIds', np);
      gatedUpdate('canPauseTeams', { pausedIds: np });
    },
    [stateRef, set, gatedUpdate]
  );

  const handleEditActiveCourt = useCallback(
    ({ courtIdx, teamAId, teamBId, courtNum }: { courtIdx: number; teamAId: string; teamBId: string; courtNum?: string | number }) => {
      const s = stateRef.current;
      if (!s.round) return;
      const tA = s.tournamentTeams.find((t) => t.id === teamAId),
        tB = s.tournamentTeams.find((t) => t.id === teamBId);
      if (!tA || !tB) return;
      const newCourts = s.round.courts.map(
        (p, i) => (i === courtIdx ? [tA, tB] : [...p]) as [typeof tA, typeof tB]
      );
      const onCourt = new Set(newCourts.flat().map((t) => t.id));
      (s.liveAdditions as any[]).forEach((la) => {
        onCourt.add(la.teamId1);
        onCourt.add(la.teamId2);
      });
      const paused = new Set((s.round.paused || []).map((t) => t.id));
      const newByeTeams = s.activeTeamIds
        .filter((id) => !onCourt.has(id) && !paused.has(id))
        .map((id) => s.tournamentTeams.find((t) => t.id === id))
        .filter(Boolean) as any[];
      const oldName = (s.round.courtNums || s.courtNumbers)[courtIdx];
      const newCourtNums = s.round.courtNums
        ? s.round.courtNums.map((n, i) => (i === courtIdx ? (courtNum ?? n) : n))
        : undefined;
      const newCourtNumbers =
        courtNum !== undefined
          ? s.courtNumbers.map((n) => (n === oldName ? courtNum : n))
          : s.courtNumbers;
      set('round', {
        ...s.round,
        courts: newCourts,
        bye: newByeTeams,
        ...(newCourtNums ? { courtNums: newCourtNums } : {}),
      } as any);
      if (courtNum !== undefined) set('courtNumbers', newCourtNumbers as any);
      const np = { ...pendingRef.current };
      delete np[courtKey(courtIdx)];
      pendingRef.current = np;
      set('pending', np);
      if (hasPermission(roleRef.current as any, 'canEditActiveCourt')) {
        const rd = {
          courtTeamIds: newCourts.map((p) => p.map((t) => t.id)),
          byeIds: newByeTeams.map((t) => t.id),
          pausedTeamIds: (s.round.paused || []).map((t) => t.id),
          ...(newCourtNums ? { courtNums: newCourtNums } : {}),
        };
        repo.pushAtomicUpdate(
          {
            roundData: rd,
            courtNumbers: newCourtNumbers,
            [`pendingResults/${courtKey(courtIdx)}`]: null,
          },
          onFirebaseError
        );
      }
      closeModal();
    },
    [stateRef, pendingRef, roleRef, set, repo, onFirebaseError, closeModal]
  );

  const handleEditLiveAddition = useCallback(
    ({ courtIdx: _courtIdx, teamAId, teamBId, courtNum }: { courtIdx: number; teamAId: string; teamBId: string; courtNum?: string | number }) => {
      const liveIdx = modal.open === 'editLive' ? modal.data : null;
      const s = stateRef.current;
      if (liveIdx === null || !(s.liveAdditions as any[])[liveIdx]) return;
      const nl = (s.liveAdditions as any[]).map((x, j) =>
        j === liveIdx
          ? {
              ...x,
              teamId1: teamAId,
              teamId2: teamBId,
              ...(courtNum !== undefined ? { courtNumber: courtNum } : {}),
            }
          : x
      );
      set('liveAdditions', nl);
      const np = { ...pendingRef.current };
      delete np[`live_${liveIdx}`];
      pendingRef.current = np;
      set('pending', np);
      gatedUpdate('canEditActiveCourt', {
        liveAdditions: nl,
        [`pendingResults/live_${liveIdx}`]: null,
      });
      closeModal();
    },
    [modal, stateRef, pendingRef, set, gatedUpdate, closeModal]
  );

  // These are called from handlePinSuccess in AppInner for the three removal cases.
  const handleRemoveActiveCourt = useCallback(
    (idx: number) => {
      const s = stateRef.current;
      if (!s.round || idx >= s.round.courts.length) {
        onFirebaseError('Court index is stale — refresh and try again.');
        return false;
      }
      const teamsRemoved = s.round.courts[idx] || [];
      const newCourts = s.round.courts.filter((_, i) => i !== idx);
      const newBye = [...(s.round.bye || []), ...teamsRemoved];
      const newCourtNums = (s.round.courtNums || s.courtNumbers).filter((_, i) => i !== idx);
      set('round', { ...s.round, courts: newCourts, bye: newBye, courtNums: newCourtNums });
      const np = reindexPendingAfterRemoval(pendingRef.current, 'court_', [idx]);
      pendingRef.current = np;
      set('pending', np);
      if (hasPermission(roleRef.current as any, 'canEditActiveCourt')) {
        const rd = {
          courtTeamIds: newCourts.map((p) => p.map((t) => t.id)),
          byeIds: newBye.map((t) => t.id),
          pausedTeamIds: (s.round.paused || []).map((t) => t.id),
          courtNums: newCourtNums,
        };
        repo.pushAtomicUpdate({ roundData: rd, pendingResults: np }, onFirebaseError);
      }
      return true;
    },
    [stateRef, pendingRef, roleRef, set, repo, onFirebaseError]
  );

  const handleRemoveLiveAddition = useCallback(
    (idx: number) => {
      const s = stateRef.current;
      const nl = s.liveAdditions.filter((_, j) => j !== idx);
      const np = reindexPendingAfterRemoval(pendingRef.current, 'live_', [idx]);
      pendingRef.current = np;
      set('liveAdditions', nl);
      set('pending', np);
      gatedUpdate('canEditActiveCourt', { liveAdditions: nl, pendingResults: np });
    },
    [stateRef, pendingRef, set, gatedUpdate]
  );

  const handleRemoveActiveRoundExtra = useCallback(
    (idx: number) => {
      const ne = stateRef.current.activeRoundExtras.filter((_, i) => i !== idx);
      set('activeRoundExtras', ne);
      gatedUpdate('canEditActiveCourt', { activeRoundExtras: ne });
    },
    [stateRef, set, gatedUpdate]
  );

  return {
    handleManageTeamsSave,
    handleTeamNameDisplayChange,
    handleManageCourtsSave,
    handleTogglePause,
    handleEditActiveCourt,
    handleEditLiveAddition,
    handleRemoveActiveCourt,
    handleRemoveLiveAddition,
    handleRemoveActiveRoundExtra,
  };
}
