import { useState, useRef } from 'react';

// Groups the Doubles Round Robin tournament state (3 values + 3 refs) so App
// doesn't declare them inline — mirrors useTPTState.
export function useDoublesRRState() {
  const [doublesRRPlayers,  setDoublesRRPlayers]  = useState({});
  const [doublesRRSchedule, setDoublesRRSchedule] = useState([]);
  const [doublesRRResults,  setDoublesRRResults]  = useState({});
  const doublesRRResultsRef         = useRef({});
  const doublesRRScheduleRef        = useRef([]);
  const doublesRRRoundCompletingRef = useRef(false);

  return {
    doublesRRPlayers, setDoublesRRPlayers,
    doublesRRSchedule, setDoublesRRSchedule,
    doublesRRResults, setDoublesRRResults,
    doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
  };
}
