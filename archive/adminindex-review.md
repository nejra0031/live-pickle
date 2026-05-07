# adminindex.js — Review Notes

---

## Bugs

- **Team-swap logic uses current state, not previous value** — In all chip selectors (`EditGameModal`, `EditActiveCourtModal`, `AddGameModal`, `PresetMatchModal`), the "swap if same" guard does `setTeamBId(teamAId)`. If `teamAId` is still an empty string at that instant, teamB becomes unset rather than swapping to the prior selection. Should capture the old value in a closure: `const prev=teamAId; setTeamAId(id); if(teamBId===id) setTeamBId(prev);`

- **Pending results race condition on round commit** — `handleResult` checks `round.courts.every((_, i) => np[courtKey(i)])` to auto-commit. If a second Firebase update arrives between the check and the state write, `round.courts` could already be null, crashing the commit.

- **`pendingRef.current` ahead of React `pending` state** — `pendingRef.current` is updated synchronously before `setPending(np)`. If the Firebase listener fires in that gap, it reads the old React state and misses in-flight pending entries.

- **Round Robin schedule read without local copy** — In `handleRRMatchResult`, `roundRobinSchedule[srIdx]` is accessed multiple times across async boundaries. If an admin simultaneously triggers `doExitRoundRobin`, the schedule becomes null mid-handler. Should capture to a local `const sched = roundRobinSchedule` at the top.

- **Preset matchup does not check for paused teams** — `handleGenerateRound` passes `pausedIds` to `generateRound`, but pre-set matchups injected via `nextRoundPresets` are not filtered against `pausedIds`. A paused team can be locked into a preset and will appear in the generated round.

- **`round.bye` assumed to exist but can be undefined** — Several render sites do `round.bye?.length > 0` correctly, but `handleEditActiveCourt` does `(round.bye||[]).map(t=>t.id)` — the `||[]` guard there is correct, but direct accesses elsewhere (e.g. history commit in `handleResult`) should also guard.

- **Negative scores accepted** — `NumInput` has `min={0}` on the DOM input but React's `onChange` returns the raw string, not clamped. A typed value of `-1` passes through and corrupts `scoreDiff` and `winnerScore`.

- **`lastSeenRoundNum` not reset on `handleRestore`** — `handleRestore` calls `updateAllStates` which sets state from saved data, but `lastSeenRoundNum.current` keeps the old value. If the restored round number is lower (e.g. restoring from an older save), subsequent Firebase updates will be skipped until the listener sees a new round number.

- **`recentWriteTokens` grows indefinitely** — Write tokens are added to a `Set` and never removed. Over a long session (dozens of rounds), this leaks memory. A rolling bounded set (max ~50) would suffice.

---

## Inefficiencies

- **`rerank(standings)` called on every render** — `const ranked = rerank(standings)` is at the bottom of `App()`, so it runs on every state change. Should be `useMemo(() => rerank(standings), [standings])`.

- **`rebuildStandings` called redundantly** — Several handlers (`handleAddGameSave`, `handleManageTeamsSave`, `handleEditSave`) each call `rebuildStandings` independently. When two handlers fire close together (e.g. rapid edits), standings are rebuilt twice from the same data.

- **Combination generator is exponential** — `combinations(tier, sl)` in bye selection has O(n! / (k!(n-k)!)) complexity. With 12 eligible teams needing 4 byes this is 495 combinations, borderline acceptable. With 15+ it becomes slow. A greedy scorer would be faster and produce equally valid results.

- **`buildMatchupCounts` and `buildByeCounts` rebuild from full history every round** — Both scan all rounds on each call. Should be cached and updated delta-style (add only the latest round's data).

- **Inline style objects created on every render** — The vast majority of JSX has deeply nested inline `style={{...}}` objects with computed clamp values. These are recreated every render. Module-level constants or `useMemo` would avoid the allocation.

- **`courtKey` and `liveKey` closures recreated each render** — `const courtKey = idx => \`court_${idx}\`` is defined inside `App()` on every render. Should be at module level.

- **Modal chip lists remapped every render** — Each modal maps `allTeamIds` to chip buttons on every render even when `allTeamIds` hasn't changed. `useMemo` on chip arrays would eliminate this.

- **`normaliseSnapshot` does deep mapping on every Firebase event** — Called on every listener fire, even for unrelated field changes (e.g. timer tick). The history, schedule, and court arrays are all re-mapped every time.

---

## Potential Issues

- **Two-admin simultaneous write creates echo loop risk** — If two admins both write at the same time, both generate unique write tokens, both listeners ignore only their own writes, and both apply each other's update. The `_writeToken` mechanism only suppresses *self*-echoes — it doesn't handle conflicts between two concurrent admins.

- **Timer desync after tab backgrounding** — `applyTimerState` calculates elapsed time as `Date.now() - timerStartedAt`. If the browser throttles the tab (background tab, low power mode), `setInterval` fires late and the displayed time lags. The `visibilitychange` handler partially addresses this, but does not force a re-render to show the correct value immediately on restore.

- **Timer alarm fires multiple times if interval stutters** — `alarmFiredRef` is the guard, but if the interval fires, sets `alarmFiredRef=true`, and then Firebase echoes new state that calls `applyTimerState` again with the old timer-running state (before the admin stop propagates), the interval restarts and could fire the alarm again.

- **Round Robin exit during score submission can lose pending results** — `doExitRoundRobin` clears `pendingRef.current` for all `rr_*` keys, but if `handleRRMatchResult` is mid-execution and has already updated `pendingRef` but not yet pushed to Firebase, the exit silently discards the entered score.

- **`generateRoundRobinSchedule` with 1 court and many teams** — With e.g. 20 teams and 1 court, the schedule produces 190 scheduling rounds (19 natural rounds × 10 matches each / 1 per sched round). Rendering 190 `CourtCard` groups in the RR section would be extremely slow.

- **`localStorage` save on every state change** — The `useEffect` that calls `saveState` has 16 dependencies and fires on any of them changing. During a round commit, multiple state variables change in sequence, triggering multiple saves (each ~10–50 KB). Should debounce.

- **Firebase listener not unsubscribed on Auth failure** — If Firebase authentication fails partway through a session, `ref.on('value', ...)` will keep retrying indefinitely without any user-visible error or teardown.

---

## UX Problems

- **No confirmation for "Back to setup (resets tournament)"** — A single tap on the small link triggers a PIN modal. If the PIN is entered correctly, the entire tournament is immediately wiped. Should show a clear warning ("This will permanently delete all rounds") before asking for PIN.

- **"Edit teams" modal shows ⚠ on teams from other courts but still allows selecting them** — The warning (`⚠`) indicates the team is already on another court, but the button is fully clickable. An admin in a hurry could accidentally duplicate a team across two courts without realising the warning means "this will create an invalid state."

- **No offline indicator** — If the device loses internet, Firebase writes silently fail. Viewers appear to see a live feed but they're looking at stale data. Should show a "⚠ Offline — changes may not be saved" banner when Firebase connection drops.

- **Round Robin progress is hard to read with many rounds** — All scheduling rounds are rendered at once, requiring significant scrolling. Completed rounds remain visible. Should collapse completed rounds by default.

- **Break timer is not shown on the viewer page** — The break banner (amber box) appears on the Play tab for the admin, but viewers on other pages (Standings, History) don't see any break notification.

- **Live additions cannot be edited, only deleted** — If a live addition game has incorrect teams or court, the only option is to delete it and re-add. An edit button (similar to CourtCard ✏ Edit) would be more user-friendly.

- **Score entry has no "undo" after confirm** — Once "✓ Confirm" is tapped on a CourtCard, the result is immediately committed. There is no way to correct a mis-tapped result without going to the History tab and using the edit flow.

- **"Finish Tournament" accessible during an active round** — The button appears in the Round Options panel even while games are still being played. Tapping it immediately ends the tournament with no pending-scores warning. Should at minimum warn if any courts have pending but uncommitted scores.

- **Preset matchup court dropdown defaults to first court which may already be "in use"** — `useState(() => courtNumbers.find(c => !usedCourtSet.has(c)) || courtNumbers[0])` falls back to the first court even if it's taken. In the edge case where ALL courts are taken, the select shows a court marked "(in use)" and the Save button is disabled with no explanation.

- **Tab swipe gesture conflicts with page scroll** — The swipe-to-change-tab gesture is detected on `onTouchStart/onTouchEnd` but doesn't suppress the default scroll behaviour. On narrow phones, a slight diagonal scroll can accidentally trigger a tab switch.

- **History tab shows rounds in reverse order with no indication** — Newest round is at the top. First-time users may expect chronological (oldest first) order. No label indicates the sort order.

- **"Regenerate Round" hint only mentions PIN if scores were entered** — The hint text reads "Regenerate if matchups need adjusting. PIN required — scores already entered." but PIN is always required for regeneration once any score is entered. The hint appears only after scores, so users may not know PIN is needed until it pops up.

---

## Security / Data Integrity

- **Firebase API key and config are public** — `firebaseConfig` is hardcoded in the client. Anyone who opens DevTools can read the database URL and key. If Firebase Security Rules are not properly configured (write-protected for unauthenticated users), anyone can overwrite tournament data.

- **Admin PIN stored and transmitted in plaintext** — PIN is read from `config/adminPin` via a plain Firebase read with no encryption. It is visible in Firebase DevTools to anyone with database access. Consider a hashed comparison or Firebase Auth instead.

- **No validation that game team IDs exist in `activeTeamIds`** — `handleResult` and `handleLiveResult` accept whatever IDs are in the form without checking against `activeTeamIds`. A manipulated request (e.g. via DevTools) could inject games with fabricated team IDs.

- **`handleAddGameSave` with `target="active"` bypasses court-conflict check** — When adding a game to the active round via `showAddGame`, `usedCourtNumbers` correctly excludes occupied courts. But `activeRoundExtras` are stored and committed without re-checking against `round.courts` court labels, so an extra game can end up displayed on the same court label as an official game.

- **No atomic transactions on multi-field writes** — Round generation pushes `roundNum`, `roundData`, `pendingResults:null`, and timer state as a single `update()` call, which Firebase does apply atomically at the path level — this is actually safe. However `pushSnapshot` uses `set()` on the root object, which is NOT atomic with any in-flight `update()` from another client.

- **Regenerating a round silently discards all entered-but-uncommitted scores** — PIN is required, but the PIN confirmation dialog says only "PIN required to regenerate." It does not say "This will delete all entered scores." The data loss is silent to the admin entering the PIN.

---

## Code Quality

- **`App()` component is ~1700 lines** — All state, effects, handlers, and rendering live in a single component. This makes it very difficult to reason about individual features. The Play, Standings, and History tabs should each be separate components, with shared state passed via props or a small context.

- **`CUSTOM_TEAMS` is a module-level mutable variable** — Mutated by `registerTeams()` outside of React's render cycle. This means changes to team names may not trigger re-renders in components that rely on `teamById()` directly without going through React state.

- **`scoreDiff` sign convention is documented nowhere** — The field tracks `winner score − loser score` per game (positive for wins, negative for losses). This is the correct convention, but nothing in the code explains it. A newcomer could easily interpret it as absolute differential.

- **Stale comment: "Full-screen timer removed from the Play tab on 2026-04-29"** — The large commented-out `FullScreenTimer` block appears twice (Swiss and RR play tabs) and still occupies ~15 lines each. Should be deleted.

- **Dead `PausePanel` component** — After the recent refactor, `PausePanel` is defined but never called. Should be removed.

- **Repeated court/game rendering code** — The court display JSX in the viewer's active-round section and the history-tab committed-game display share almost identical structure but are copy-pasted. Could be extracted to a `<GameResultRow>` component.

- **`ORDINAL` function defined but tested only with positive integers** — No guard for 0 or negative numbers. `ORDINAL(0)` returns `"0th"` which is correct but `ORDINAL(-1)` returns `"-1th"`.

- **Hardcoded 4-second timeout for initial Firebase load** — `setTimeout(() => { if(!initialLoadDone.current) setPhase("waiting"); }, 4000)` is arbitrary. On slow connections this is too short; on fast connections it causes a 4-second blank/loading state unnecessarily.

- **`toArr()` handles null, string, number, array, and object — too broad** — The function normalises Firebase's "array stored as object" quirk. But handling strings and numbers (lines 56-57) means a single malformed field value silently becomes `[value]` instead of throwing, masking bad data.

- **No error boundary** — React renders a blank page on any unhandled render error. A simple `<ErrorBoundary>` wrapper would catch crashes and show a "Something went wrong — reload to reconnect" message.

- **`useCallback` dependencies include everything** — `updateAllStates` is wrapped in `useCallback(fn, [])` with an empty dep array, but the function references `applyTimerState` which itself references refs that are mutable. This works correctly because refs are stable, but it's fragile — adding any real dependency without updating the array would introduce a stale closure bug.

- **Inline functions as event handlers everywhere** — `onClick={()=>setShowBreakModal(true)}` and similar appear dozens of times. Each creates a new function object every render. Should use `useCallback` where the handler is passed to a child that checks referential equality.
