import { useState, useRef } from 'react';

// Groups the Doubles Round Robin tournament state (3 values + 4 refs) so App
// doesn't declare them inline — mirrors useTPTState.
export function useDoublesRRState() {
  const [doublesRRPlayers,  setDoublesRRPlayers]  = useState({});
  const [doublesRRSchedule, setDoublesRRSchedule] = useState([]);
  const [doublesRRResults,  setDoublesRRResults]  = useState({});
  const doublesRRPlayersRef         = useRef({});
  const doublesRRResultsRef         = useRef({});
  const doublesRRScheduleRef        = useRef([]);
  const doublesRRRoundCompletingRef = useRef(false);

  return {
    doublesRRPlayers, setDoublesRRPlayers,
    doublesRRSchedule, setDoublesRRSchedule,
    doublesRRResults, setDoublesRRResults,
    doublesRRPlayersRef, doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
  };
}
