import { useState, useRef } from 'react';

// Groups the 3-Player Team tournament state (4 values + 3 refs) so App doesn't
// declare them inline. Setters and refs are returned as-is, so every existing
// call site (updateAllStates, doReset, handleStartTPT, handleTPTResult) works
// unchanged. A future step can move the TPT handlers here too (plan C.4).
export function useTPTState() {
  const [tptTeams, setTPTTeams] = useState<Record<string, any>>({});
  const [tptPlayers, setTPTPlayers] = useState<Record<string, any>>({});
  const [tptSchedule, setTPTSchedule] = useState<any[]>([]);
  const [tptResults, setTPTResults] = useState<Record<string, any>>({});
  const [tptSubstitutions, setTPTSubstitutions] = useState<Record<string, any>>({});
  const tptResultsRef = useRef<Record<string, any>>({});
  const tptScheduleRef = useRef<any[]>([]);
  const tptRoundCompletingRef = useRef(false);
  const tptSubstitutionsRef = useRef<Record<string, any>>({});

  return {
    tptTeams,
    setTPTTeams,
    tptPlayers,
    setTPTPlayers,
    tptSchedule,
    setTPTSchedule,
    tptResults,
    setTPTResults,
    tptSubstitutions,
    setTPTSubstitutions,
    tptResultsRef,
    tptScheduleRef,
    tptRoundCompletingRef,
    tptSubstitutionsRef,
  };
}
