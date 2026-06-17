import { hasPermission } from '../roleConfig';

// Removes a single result from a scheduled-format results map (TPT or DoublesRR)
// and pushes a null tombstone to Firebase. If the round this result belongs to
// had already auto-completed and been appended to history (only possible for
// the final scheduled round, which stays the "current round" after completion),
// that history entry is rolled back too — otherwise it would keep showing the
// undone game's old score even after a corrected result is resubmitted.
export function undoScheduledResult({
  roleRef,
  resultsRef,
  setResults,
  firebasePath,
  key,
  onFirebaseError,
  stateRef,
  set,
  roundCompletingRef,
  pushAtomicUpdate,
}) {
  if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
  const newResults = { ...resultsRef.current };
  delete newResults[key];
  setResults(newResults);
  resultsRef.current = newResults;

  const updates: Record<string, any> = { [`${firebasePath}/${key}`]: null };

  const ri = Number(key.split('_')[0]);
  const { history, roundNum } = stateRef.current;
  if (history.length === ri + 1) {
    const newHistory = history.slice(0, -1);
    const newRoundNum = roundNum - 1;
    set('history', newHistory);
    set('roundNum', newRoundNum);
    if (roundCompletingRef) roundCompletingRef.current = false;
    updates.history = newHistory;
    updates.roundNum = newRoundNum;
  }

  pushAtomicUpdate(updates, onFirebaseError);
}

// Records a result for a scheduled-format round (TPT or DoublesRR).
// The format-specific parts — completion check and history-entry construction —
// are supplied as callbacks so this function owns the shared scaffolding only.
export function submitScheduledResult({
  key,
  result,
  resultsRef,
  setResults,
  firebasePath,
  roundCompletingRef,
  getScheduleRound,
  isRoundComplete,
  buildHistEntry,
  stateRef,
  set,
  roleRef,
  onFirebaseError,
  pushAtomicUpdate,
}) {
  if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
  const newResults = { ...resultsRef.current, [key]: result };
  setResults(newResults);
  resultsRef.current = newResults;

  const schedRound = getScheduleRound();
  if (!schedRound) {
    pushAtomicUpdate({ [`${firebasePath}/${key}`]: result }, onFirebaseError);
    return;
  }

  const allDone = !roundCompletingRef.current && isRoundComplete(schedRound, newResults);
  if (!allDone) {
    pushAtomicUpdate({ [`${firebasePath}/${key}`]: result }, onFirebaseError);
    return;
  }

  roundCompletingRef.current = true;
  const newRoundNum = stateRef.current.roundNum + 1;
  const histEntry = buildHistEntry(schedRound, newResults, newRoundNum);
  const newHistory = [...stateRef.current.history, histEntry];
  pushAtomicUpdate(
    { [`${firebasePath}/${key}`]: result, history: newHistory, roundNum: newRoundNum },
    onFirebaseError
  );
  set('history', newHistory);
  set('roundNum', newRoundNum);
  roundCompletingRef.current = false;
}
