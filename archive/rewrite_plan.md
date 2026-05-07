# Rewrite Plan — Vite + React

Migrating from single-file Babel-standalone to a proper Vite project.
All output goes in `/new/`. Never touch files outside `/new/`.
Carries all fixes from `adminindex-review.md`.

---

## Project structure

```
/new/
  index.html
  package.json
  vite.config.js
  tailwind.config.js
  postcss.config.js
  public/
    ball.png
    favicon.png
  src/
    main.jsx               — entry: mounts <App/>
    index.css              — Tailwind directives + custom classes
    firebase.js            — init, db, pushSnapshot, pushAtomicUpdate
    constants.js           — ALL_TEAMS, ORDINAL, CONNECT_TIMEOUT_MS, key fns
    storage.js             — saveState / loadState / clearSave
    audio.js               — playAlarm, playWarningBeep, warmUpAudio
    normalise.js           — toArr, normaliseSnapshot
    algorithms/
      standings.js         — mkStandings, rerank, rebuildStandings
      pairing.js           — pairBottomUp, generateRound, helpers
      roundRobin.js        — generateRoundRobinSchedule
      bye.js               — buildByeCounts, scoreByeGroup (greedy)
    hooks/
      useOnline.js
      useDebounce.js
    context/
      TeamRegistryContext.jsx
    components/
      ErrorBoundary.jsx
      NumInput.jsx          — clamped to ≥ 0
      TeamChip.jsx
      CourtCard.jsx         — onEdit, onUndo props
      GameResultRow.jsx     — extracted from history tab
      RoundTimer.jsx
      RestoreBanner.jsx
    modals/
      ConfirmModal.jsx      — NEW: generic confirm before PIN
      PinModal.jsx
      TimerSettingsModal.jsx
      BreakModal.jsx
      EditGameModal.jsx
      EditActiveCourtModal.jsx
      AddGameModal.jsx
      PresetMatchModal.jsx
      ManageTeamsModal.jsx
      ManageCourtsModal.jsx
      SelectRoundRobinTeamsModal.jsx
    tabs/
      StandingsTab.jsx
      HistoryTab.jsx        — sort toggle, RR accordion
    setup/
      SetupScreen.jsx
    App.jsx                 — state, effects, handlers; routes to tabs
```

---

## Chunks

### Chunk 1 — Project scaffolding
- [DONE] `package.json` (React 18, Firebase 9, Vite 5, Tailwind 3)
- [DONE] `vite.config.js`
- [DONE] `tailwind.config.js` + `postcss.config.js`
- [DONE] `index.html`
- [DONE] `src/index.css` (Tailwind directives + all custom classes from adminindex.css)
- [DONE] `src/main.jsx` (stub entry point)
- [DONE] Copy `ball.png` + `favicon.png` → `public/`

### Chunk 2 — Pure utility modules
- [DONE] `src/constants.js` — ALL_TEAMS, ORDINAL (guarded), CONNECT_TIMEOUT_MS, courtKey, liveKey
- [DONE] `src/storage.js` — saveState, loadState, clearSave
- [DONE] `src/audio.js` — getAudioCtx, playWarningBeep, playAlarm, warmUpAudio
- [DONE] `src/normalise.js` — toArr (tightened), normaliseSnapshot

### Chunk 3 — Algorithm modules
- [DONE] `src/algorithms/standings.js`
- [DONE] `src/algorithms/bye.js` — greedy selection (no more exponential combinations)
- [DONE] `src/algorithms/pairing.js`
- [DONE] `src/algorithms/roundRobin.js`

### Chunk 4 — Hooks, context, Firebase
- [DONE] `src/hooks/useOnline.js`
- [DONE] `src/hooks/useDebounce.js`
- [DONE] `src/context/TeamRegistryContext.jsx`
- [DONE] `src/firebase.js` (modular API, .catch on every write, bounded write tokens)

### Chunk 5 — Shared UI components
- [DONE] `src/components/ErrorBoundary.jsx`
- [DONE] `src/components/NumInput.jsx` (clamped ≥ 0)
- [DONE] `src/components/TeamChip.jsx`
- [DONE] `src/components/CourtCard.jsx` (onEdit, onUndo)
- [DONE] `src/components/GameResultRow.jsx`
- [DONE] `src/components/RoundTimer.jsx`
- [DONE] `src/components/RestoreBanner.jsx`

### Chunk 6 — Modals (simple)
- [DONE] `src/modals/ConfirmModal.jsx` (new — used before destructive PIN prompts)
- [DONE] `src/modals/PinModal.jsx`
- [DONE] `src/modals/TimerSettingsModal.jsx`
- [DONE] `src/modals/BreakModal.jsx`

### Chunk 7 — Modals (game / court)
- [DONE] `src/modals/EditGameModal.jsx` (team-swap capture fix)
- [DONE] `src/modals/EditActiveCourtModal.jsx` (force-override toggle for ⚠ chips)
- [DONE] `src/modals/AddGameModal.jsx` (usedTeamIds, usedCourtNumbers, all-courts-taken msg)
- [DONE] `src/modals/PresetMatchModal.jsx` (usedCourtNumbers, all-courts-taken msg)

### Chunk 8 — Modals (team / court management)
- [DONE] `src/modals/ManageTeamsModal.jsx` (pause section inline)
- [DONE] `src/modals/ManageCourtsModal.jsx`
- [DONE] `src/modals/SelectRoundRobinTeamsModal.jsx`

### Chunk 9 — Setup screen
- [DONE] `src/setup/SetupScreen.jsx`

### Chunk 10 — Tab components
- [DONE] `src/tabs/StandingsTab.jsx`
- [DONE] `src/tabs/HistoryTab.jsx` (sort toggle, RR completed-round accordion, GameResultRow)

### Chunk 11 — Play tab
- [DONE] `src/tabs/PlayTab.jsx` (Swiss active + between-rounds + RR, admin + viewer branches)

### Chunk 12 — App.jsx
- [DONE] All state declarations
- [DONE] All Firebase effects + listener
- [DONE] All handlers (round generation, result entry, RR, edits, timer)
- [DONE] Offline banner, firebase-error toast
- [DONE] "Back to setup" ConfirmModal before PIN
- [DONE] "Finish Tournament" pending-scores guard
- [DONE] Tab routing to StandingsTab / HistoryTab / PlayTab

---

## Review fixes carried in (from adminindex-review.md)

| Fix | Chunk |
|-----|-------|
| Team-swap capture | 7 |
| Negative scores clamped | 5 |
| `lastSeenRoundNum` reset on restore | 12 |
| Preset paused-team filter | 12 |
| RR schedule local-const capture | 12 |
| `round.bye/paused` guarded | 11, 12 |
| Pending race on commit | 12 |
| `useMemo` for ranked | 12 |
| Debounced localStorage | 12 |
| Greedy bye selection | 3 |
| `useCallback` on key handlers | 12 |
| Offline indicator | 12 |
| Firebase error handling + toast | 4, 12 |
| "Back to setup" ConfirmModal | 12 |
| "Finish Tournament" pending guard | 11 |
| Regenerate hint always visible | 11 |
| Swipe steeper angle threshold | 12 |
| History tab sort toggle | 10 |
| RR completed rounds accordion | 10 |
| Live addition edit button | 11 |
| CourtCard undo button | 5 |
| "Edit teams" force-override toggle | 8 |
| All-courts-taken message | 7 |
| Validate team IDs in handleResult | 12 |
| Court conflict check for extras | 12 |
| PIN regenerate warns about score loss | 12 |
| ErrorBoundary | 5 |
| `toArr` tightened | 2 |
| ORDINAL guarded | 2 |
| PausePanel removed | — never added |
| FullScreenTimer stale comments | — never copied |
| GameResultRow extracted | 5 |
| courtKey/liveKey at module level | 2 |
| CONNECT_TIMEOUT_MS constant | 2 |
| scoreDiff documented | 3 |
| recentWriteTokens bounded | 4 |

---

## Progress tracker

| Chunk | Description | Status |
|-------|-------------|--------|
| 1 | Scaffolding | ✅ DONE |
| 2 | Utility modules | ✅ DONE |
| 3 | Algorithms | ✅ DONE |
| 4 | Hooks / context / Firebase | ✅ DONE |
| 5 | Shared UI components | ✅ DONE |
| 6 | Modals (simple) | ✅ DONE |
| 7 | Modals (game/court) | ✅ DONE |
| 8 | Modals (team/court mgmt) | ✅ DONE |
| 9 | Setup screen | ✅ DONE |
| 10 | Tab components | ✅ DONE |
| 11 | Play tab | ✅ DONE |
| 12 | App.jsx | ✅ DONE |
