import { useState, useRef } from 'react';

// Groups the 3-Player Team tournament state (4 values + 3 refs) so App doesn't
// declare them inline. Setters and refs are returned as-is, so every existing
// call site (updateAllStates, doReset, handleStartTPT, handleTPTResult) works
// unchanged. A future step can move the TPT handlers here too (plan C.4).
export function useTPTState() {
  const [tptTeams,    setTPTTeams]    = useState({});
  const [tptPlayers,  setTPTPlayers]  = useState({});
  const [tptSchedule, setTPTSchedule] = useState([]);
  const [tptResults,  setTPTResults]  = useState({});
  const [tptSubstitutions, setTPTSubstitutions] = useState({});
  const tptResultsRef         = useRef({});
  const tptScheduleRef        = useRef([]);
  const tptRoundCompletingRef = useRef(false);
  const tptSubstitutionsRef   = useRef({});

  return {
    tptTeams, setTPTTeams,
    tptPlayers, setTPTPlayers,
    tptSchedule, setTPTSchedule,
    tptResults, setTPTResults,
    tptSubstitutions, setTPTSubstitutions,
    tptResultsRef, tptScheduleRef, tptRoundCompletingRef, tptSubstitutionsRef,
  };
}
