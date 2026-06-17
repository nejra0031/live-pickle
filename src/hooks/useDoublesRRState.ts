import { useState, useRef } from 'react';

// Groups the Doubles Round Robin tournament state (3 values + 4 refs) so App
// doesn't declare them inline — mirrors useTPTState.
export function useDoublesRRState() {
  const [doublesRRPlayers, setDoublesRRPlayers] = useState<Record<string, any>>({});
  const [doublesRRSchedule, setDoublesRRSchedule] = useState<any[]>([]);
  const [doublesRRResults, setDoublesRRResults] = useState<Record<string, any>>({});
  const doublesRRPlayersRef = useRef<Record<string, any>>({});
  const doublesRRResultsRef = useRef<Record<string, any>>({});
  const doublesRRScheduleRef = useRef<any[]>([]);
  const doublesRRRoundCompletingRef = useRef(false);

  return {
    doublesRRPlayers,
    setDoublesRRPlayers,
    doublesRRSchedule,
    setDoublesRRSchedule,
    doublesRRResults,
    setDoublesRRResults,
    doublesRRPlayersRef,
    doublesRRResultsRef,
    doublesRRScheduleRef,
    doublesRRRoundCompletingRef,
  };
}
