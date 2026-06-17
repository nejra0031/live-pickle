import { useState, useEffect, useRef, useCallback } from 'react';
import { hasPermission } from '../roleConfig';

export function useRoundTimer({ timerDuration, roleRef, onFirebaseError, repo }: {
  timerDuration: number;
  roleRef: { current: string | null };
  onFirebaseError: (msg: string) => void;
  repo: { pushAtomicUpdate: (fields: Record<string, any>, onErr: (msg: string) => void) => void };
}) {
  const timerRunningRef = useRef(false);
  const timerStartedAtRef = useRef<number | null>(null);
  const timerPausedSecsRef = useRef(0);
  const timerDurationRef = useRef(timerDuration);
  const timerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecsLeft, setTimerSecsLeft] = useState(timerDuration);
  const [timerAlarmed, setTimerAlarmed] = useState(false);

  useEffect(() => {
    timerDurationRef.current = timerDuration;
  }, [timerDuration]);

  const computeSecsLeft = useCallback(() => {
    if (!timerRunningRef.current || !timerStartedAtRef.current) return timerPausedSecsRef.current;
    return Math.max(
      0,
      timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)
    );
  }, []);

  const applyTimerState = useCallback(
    (running: boolean, startedAt: number | null, pausedSecs: number) => {
      timerRunningRef.current = running;
      timerStartedAtRef.current = startedAt;
      timerPausedSecsRef.current = pausedSecs;
      const secs =
        running && startedAt
          ? Math.max(0, pausedSecs - Math.floor((Date.now() - startedAt) / 1000))
          : pausedSecs;
      setTimerSecsLeft(secs);
      setTimerRunning(running);
      clearInterval(timerTickRef.current ?? undefined);
      if (running && startedAt && secs > 0) {
        timerTickRef.current = setInterval(() => {
          const s = computeSecsLeft();
          setTimerSecsLeft(s);
          if (s <= 0) {
            clearInterval(timerTickRef.current ?? undefined);
            if (timerDurationRef.current > 0) {
              timerRunningRef.current = false;
              setTimerRunning(false);
              setTimerAlarmed(true);
            }
          }
        }, 500);
      }
    },
    [computeSecsLeft]
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!timerRunningRef.current || !timerStartedAtRef.current) return;
      setTimerSecsLeft(computeSecsLeft());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [computeSecsLeft]);

  const resetTimer = useCallback(
    (ns?: number | null) => {
      const s = ns ?? timerDurationRef.current;
      setTimerAlarmed(false);
      applyTimerState(false, null, s);
      if (hasPermission(roleRef.current, 'canEditTimer')) {
        repo.pushAtomicUpdate(
          { timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s },
          onFirebaseError
        );
      }
    },
    [applyTimerState, roleRef, onFirebaseError, repo]
  );

  const timerToggle = useCallback(() => {
    if (!timerRunningRef.current) {
      const sa = Date.now();
      applyTimerState(true, sa, timerPausedSecsRef.current);
      if (hasPermission(roleRef.current, 'canEditTimer')) {
        repo.pushAtomicUpdate(
          {
            timerRunning: true,
            timerStartedAt: sa,
            timerPausedSecsLeft: timerPausedSecsRef.current,
          },
          onFirebaseError
        );
      }
    } else {
      const s = computeSecsLeft();
      applyTimerState(false, null, s);
      if (hasPermission(roleRef.current, 'canEditTimer')) {
        repo.pushAtomicUpdate(
          { timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s },
          onFirebaseError
        );
      }
    }
  }, [applyTimerState, computeSecsLeft, roleRef, onFirebaseError, repo]);

  return {
    timerRunning,
    timerSecsLeft,
    timerAlarmed,
    setTimerAlarmed,
    timerRunningRef,
    timerStartedAtRef,
    timerPausedSecsRef,
    timerDurationRef,
    computeSecsLeft,
    applyTimerState,
    resetTimer,
    timerToggle,
  };
}
