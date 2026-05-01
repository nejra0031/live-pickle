# Rewrite Plan — adminindex → /new/

All fixes target issues logged in `adminindex-review.md`.
Mark each item `DONE` when complete. Never touch files outside `/new/`.

---

## Output files
- `/new/adminindex.html`   — HTML shell (unchanged structure, references new JS/CSS)
- `/new/adminindex.js`    — Main JSX, fully reorganised
- `/new/adminindex.css`   — Enhanced stylesheet
- `/new/ball.png`         — copied from parent
- `/new/favicon.png`      — copied from parent

---

## Phase 0 — Scaffolding
- [DONE] Create `/new/` directory and copy static assets (ball.png, favicon.png)
- [DONE] Write `/new/adminindex.html` shell
- [DONE] Write `/new/adminindex.css` (start from existing, add new classes as needed)

---

## Phase 1 — Module structure & constants
- [ ] Move `courtKey` / `liveKey` to module level (not recreated each render)
- [ ] Add `ErrorBoundary` class component wrapping `<App/>`
- [ ] Add `useOnline` hook for offline detection
- [ ] Bound `recentWriteTokens` to max 50 entries (rolling eviction)
- [ ] Add `CONNECT_TIMEOUT_MS = 6000` named constant (replaces magic 4000)
- [ ] Document `scoreDiff` sign convention with a comment
- [ ] Fix `ORDINAL` to guard against 0 / negative input

---

## Phase 2 — Data / normalisation layer
- [ ] Tighten `toArr`: only normalise null/object-with-numeric-keys; leave unexpected
        scalar types as-is (return `[]`) rather than silently wrapping
- [ ] Cache `normaliseSnapshot` heavy arrays: skip re-mapping history / schedule
        when Firebase snapshot hash matches previous (compare `_writeToken`)
- [ ] Replace module-level mutable `CUSTOM_TEAMS` + `registerTeams` with a
        `TeamRegistryContext` (React context) so team lookups re-render correctly
- [ ] `teamById` reads from context instead of module global

---

## Phase 3 — Bug fixes
- [ ] Team-swap capture: capture previous value before calling setter
        (`const prev=teamAId; setTeamAId(id); if(teamBId===id) setTeamBId(prev)`)
        — applies in EditGameModal, EditActiveCourtModal, AddGameModal, PresetMatchModal
- [ ] Negative scores: clamp NumInput onChange to `Math.max(0, value)` so `-1` is rejected
- [ ] `lastSeenRoundNum` reset on `handleRestore` (set before calling `updateAllStates`)
- [ ] Preset matchup paused-team filter: strip any `nextRoundPresets` entry whose
        team IDs are in `pausedIds` before injecting into the generated round
- [ ] Round Robin schedule captured to local const at top of `handleRRMatchResult`
        to avoid null-access if `doExitRoundRobin` fires concurrently
- [ ] `round.bye` / `round.paused` guarded with `|| []` at every access site
- [ ] Pending results race on commit: snapshot `round.courts.length` to a local
        variable before the async pendingRef update so the "all courts filled" check
        uses a stable value

---

## Phase 4 — Performance
- [ ] `useMemo` for `ranked = rerank(standings)` (dep: `standings`)
- [ ] Debounce `localStorage` save — 800 ms trailing debounce on the save effect
- [ ] `courtKey` / `liveKey` at module level (covered by Phase 1)
- [ ] Replace exponential `combinations()` bye-selection with greedy scorer:
        iterate candidates sorted by bye-penalty and pick greedily; same quality result
        in O(n log n) instead of O(n!)
- [ ] Delta-cached `buildMatchupCounts` / `buildByeCounts`: accept previous counts
        + a single new history entry to update; full rebuild only on first call
- [ ] `useCallback` on `handleTogglePause`, `handleManageTeamsSave`,
        `handleManageCourtsSave`, `pushAtomicUpdate`, `pushSnapshot`, `updateAllStates`

---

## Phase 5 — UX improvements
- [ ] Offline indicator: amber banner in fixed header when `useOnline()` returns false,
        visible on all tabs; "⚠ Offline — changes may not be saved"
- [ ] Break timer shown on Standings + History tabs (not only Play tab) via the
        header `RoundTimer` component that is already pinned to all tabs
- [ ] "Back to setup" confirmation: show a ConfirmModal ("⚠ This will permanently
        delete all rounds and standings. Continue?") *before* the PIN modal
- [ ] "Finish Tournament" guard: if `Object.keys(pending).length > 0`, show warning
        ("X courts still have uncommitted scores") and require confirmation
- [ ] "Regenerate Round" PIN hint: always show "PIN required to regenerate"
        (not only when scores are entered)
- [ ] Tab swipe: require horizontal displacement ≥ 60 px AND `|dx| > 2 * |dy|`
        (steeper angle threshold) to avoid triggering on diagonal scroll
- [ ] History tab: add "newest first ↑" / toggle to "oldest first ↓" button
- [ ] Round Robin completed rounds: collapse by default; show "▶ Round X — ✓ Complete"
        accordion header; expand on tap
- [ ] Live additions: add ✏ Edit button (same as CourtCard) opening a small modal
        to change teams/court, mirroring the active-court edit flow
- [ ] CourtCard: add a small "✕ Undo" link after confirm so the admin can retract
        a mis-tapped result within the same round (clears that court's pending entry)
- [ ] "Edit teams" modal: make ⚠-flagged chips non-clickable by default; add a
        "Force override" toggle that unlocks them, preventing accidental duplicates
- [ ] All-courts-taken edge case in PresetMatchModal / AddGameModal: when every court
        is in `usedCourtNumbers`, show "All courts are already assigned for this round"
        message and disable Save

---

## Phase 6 — Security / data integrity
- [ ] Validate team IDs in `handleResult` and `handleLiveResult`: reject winnerId /
        loserId not in `activeTeamIds`
- [ ] Validate court labels in `handleAddGameSave` (active target): re-check that
        the submitted court is not already in `round.courts` or `liveAdditions` before
        appending to `activeRoundExtras`
- [ ] PIN confirmation title for "Regenerate Round" explicitly states: "This will
        discard all entered scores for the current round"
- [ ] `pushSnapshot` race note: add comment documenting that `set()` is non-atomic
        with concurrent `update()` from other clients; mitigation is that only the
        generating admin calls `pushSnapshot` (round start) while others use `update()`
- [ ] Firebase error handling: add `.catch(err => console.error('Firebase write failed', err))`
        to every `db.ref(...).set()` / `update()` / `once()` call; surface a toast/banner
        if a write fails so the admin knows to retry

---

## Phase 7 — Code quality / cleanup
- [ ] Remove dead `PausePanel` component definition
- [ ] Delete both stale commented-out `FullScreenTimer` blocks (Swiss + RR play tabs)
- [ ] Extract `GameResultRow` component used in both the History tab game list and
        any committed-game displays (reduces copy-paste)
- [ ] Split rendering into sub-components:
  - [ ] `StandingsTab` — receives `ranked`, `pausedIds`
  - [ ] `HistoryTab` — receives `history`, `ranked`, RR snapshot props, admin callbacks
- [ ] `App` component reduced to: state declarations, effects, handlers, thin render
- [ ] Replace hardcoded `4000` timeout with `CONNECT_TIMEOUT_MS` constant (Phase 1)
- [ ] Add `/* scoreDiff: cumulative (winnerScore−loserScore) per game; negative on loss */`
        comment above `mkStandings` (Phase 1 already notes this)

---

## Progress tracker

| Phase | Items | Done |
|-------|-------|------|
| 0 — Scaffolding | 3 | **3** ✅ |
| 1 — Module structure | 7 | 0 |
| 2 — Data layer | 4 | 0 |
| 3 — Bug fixes | 7 | 0 |
| 4 — Performance | 6 | 0 |
| 5 — UX | 12 | 0 |
| 6 — Security | 5 | 0 |
| 7 — Code quality | 7 | 0 |
| **Total** | **51** | **3** |

## Session notes
- Phase 0 fully complete: `/new/adminindex.html`, `/new/adminindex.css`, `ball.png`, `favicon.png` all written.
- `/new/adminindex.js` not yet started — next session should begin Phase 1.
