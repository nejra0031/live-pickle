import { pushAtomicUpdate } from '../firebase';
import { hasPermission } from '../roleConfig';

// Removes a single result from a scheduled-format results map (TPT or DoublesRR)
// and pushes a null tombstone to Firebase.
export function undoScheduledResult(roleRef, resultsRef, setResults, firebasePath, key, onFirebaseError) {
  if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
  const newResults = { ...resultsRef.current };
  delete newResults[key];
  setResults(newResults);
  resultsRef.current = newResults;
  pushAtomicUpdate({ [`${firebasePath}/${key}`]: null }, onFirebaseError);
}

// Records a result for a scheduled-format round (TPT or DoublesRR).
// The format-specific parts — completion check and history-entry construction —
// are supplied as callbacks so this function owns the shared scaffolding only.
export function submitScheduledResult({
  key, result,
  resultsRef, setResults, firebasePath,
  roundCompletingRef,
  getScheduleRound,
  isRoundComplete,
  buildHistEntry,
  stateRef, setHistory, setRoundNum,
  roleRef, onFirebaseError,
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
  pushAtomicUpdate({ [`${firebasePath}/${key}`]: result, history: newHistory, roundNum: newRoundNum }, onFirebaseError);
  setHistory(newHistory);
  setRoundNum(newRoundNum);
  roundCompletingRef.current = false;
}
