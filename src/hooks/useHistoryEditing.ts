import { useCallback } from 'react';
import { rebuildStandings } from '../algorithms/standings';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useRepo } from '../state/RepoProvider';

export function useHistoryEditing({
  gatedUpdate,
  setStandings,
  onFirebaseError,
  tptSubstitutionsRef,
  setTPTSubstitutions,
  roleRef,
}) {
  const { set, stateRef } = useTournamentState();
  const { modal, closeModal } = useModal();
  const repo = useRepo();

  const handleEditSave = useCallback(
    (ri, gameIdx, { game: ng, newBye }) => {
      const s = stateRef.current;
      const nh = s.history.map((h, i) =>
        i !== ri
          ? h
          : {
              ...h,
              games: h.games.map((g, gi) => (gi !== gameIdx ? g : { ...ng })),
              bye: newBye,
            }
      );
      set('history', nh);
      setStandings(rebuildStandings(s.activeTeamIds, nh));
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      closeModal();
    },
    [stateRef, set, gatedUpdate, setStandings, closeModal]
  );

  const handleTPTHistoryEditSave = useCallback(
    (ri, mi, gi, result) => {
      const nh = stateRef.current.history.map((h, i) => {
        if (i !== ri || !h.tptMatchups) return h;
        const newMatchups = h.tptMatchups.map((m, mIdx) => {
          if (mIdx !== mi) return m;
          return { ...m, games: (m.games || []).map((g, gIdx) => (gIdx !== gi ? g : result)) };
        });
        return { ...h, tptMatchups: newMatchups };
      });
      set('history', nh);
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      closeModal();
    },
    [stateRef, set, gatedUpdate, closeModal]
  );

  const handleSetTPTSubstitution = useCallback(
    (ri, mi, gi, subsMap) => {
      const key = `${ri}_${mi}_${gi}`;
      const hasSubs = subsMap && Object.keys(subsMap).length > 0;
      const next = { ...tptSubstitutionsRef.current };
      if (hasSubs) next[key] = subsMap;
      else delete next[key];
      setTPTSubstitutions(next);
      tptSubstitutionsRef.current = next;
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], {
        [`tptSubstitutions/${key}`]: hasSubs ? subsMap : null,
      });
      closeModal();
    },
    [gatedUpdate, closeModal] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDoublesRRHistoryEditSave = useCallback(
    (ri, ci, result) => {
      const nh = stateRef.current.history.map((h, i) => {
        if (i !== ri || !h.doublesRRCourts) return h;
        return {
          ...h,
          doublesRRCourts: h.doublesRRCourts.map((c, cIdx) =>
            cIdx !== ci ? c : { ...c, ...result }
          ),
        };
      });
      set('history', nh);
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      closeModal();
    },
    [stateRef, set, gatedUpdate, closeModal]
  );

  const handleAddGameSave = useCallback(
    (target, game) => {
      const s = stateRef.current;
      if (target === 'active') {
        if (s.round) {
          const ne = [...s.activeRoundExtras, game];
          set('activeRoundExtras', ne);
          gatedUpdate('canEditActiveCourt', { activeRoundExtras: ne });
        } else if (s.history.length > 0) {
          const ri = s.history.length - 1;
          const nh = s.history.map((h, i) => (i !== ri ? h : { ...h, games: [...h.games, game] }));
          const ns = rebuildStandings(s.activeTeamIds, nh);
          set('history', nh);
          setStandings(ns);
          gatedUpdate('canFullEditHistory', { history: nh });
        } else {
          return;
        }
      } else {
        const ri = Number(target);
        const nh = s.history.map((h, i) => (i !== ri ? h : { ...h, games: [...h.games, game] }));
        const ns = rebuildStandings(s.activeTeamIds, nh);
        set('history', nh);
        setStandings(ns);
        gatedUpdate('canFullEditHistory', { history: nh });
      }
      closeModal();
    },
    [stateRef, set, gatedUpdate, setStandings, closeModal]
  );

  const handleEditCourtNumber = useCallback(
    (ri, gi, newCourtNum) => {
      const trimmed = String(newCourtNum).trim();
      if (!trimmed) return;
      const nh = stateRef.current.history.map((h, i) =>
        i !== ri
          ? h
          : {
              ...h,
              games: h.games.map((g, j) => (j !== gi ? g : { ...g, courtNumber: trimmed })),
            }
      );
      set('history', nh);
      gatedUpdate('canFullEditHistory', { history: nh });
    },
    [stateRef, set, gatedUpdate]
  );

  const handleConfirmRemoveGame = useCallback(() => {
    const { ri, gameIdx } = modal.data || {};
    if (ri == null) return;
    const s = stateRef.current;
    const nh = s.history.map((h, i) =>
      i !== ri ? h : { ...h, games: h.games.filter((_, gi) => gi !== gameIdx) }
    );
    const ns = rebuildStandings(s.activeTeamIds, nh);
    set('history', nh);
    setStandings(ns);
    if (roleRef.current === 'admin') repo.pushAtomicUpdate({ history: nh }, onFirebaseError);
    closeModal();
  }, [modal.data, stateRef, set, setStandings, roleRef, repo, onFirebaseError, closeModal]);

  const handleTimerSettingsSave = useCallback(
    (m) => {
      set('timerDefaultMins', m);
      set('timerDuration', m * 60);
      gatedUpdate('canEditTimer', { timerDefaultMins: m, timerDuration: m * 60 });
      closeModal();
    },
    [set, gatedUpdate, closeModal]
  );

  const handleAddPreset = useCallback(
    (p) => {
      const np = [...stateRef.current.nextRoundPresets, p];
      set('nextRoundPresets', np);
      gatedUpdate('canPresetMatch', { nextRoundPresets: np });
      closeModal();
    },
    [stateRef, set, gatedUpdate, closeModal]
  );

  const handleAddLiveGame = useCallback(
    (la) => {
      const nl = [...stateRef.current.liveAdditions, la];
      set('liveAdditions', nl);
      gatedUpdate('canLiveAddGame', { liveAdditions: nl });
      closeModal();
    },
    [stateRef, set, gatedUpdate, closeModal]
  );

  return {
    handleEditSave,
    handleTPTHistoryEditSave,
    handleSetTPTSubstitution,
    handleDoublesRRHistoryEditSave,
    handleAddGameSave,
    handleEditCourtNumber,
    handleConfirmRemoveGame,
    handleTimerSettingsSave,
    handleAddPreset,
    handleAddLiveGame,
  };
}
