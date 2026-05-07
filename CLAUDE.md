# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server (hot reload, serves _viewer.html and _admin.html)
npm run build    # Production build → outputs to v2/ (renames _viewer→index.html, _admin→adm.html)
npm run preview  # Preview the v2/ build locally
```

After build, commit and push `v2/` to deploy to GitHub Pages at `/live-pickle/v2/`.

**Only commit or push to GitHub when explicitly asked to do so.**

No linter or test suite is configured.

## Architecture

### Two entry points, one codebase

`_viewer.html` → `src/viewer-main.jsx` — read-only view, no admin controls  
`_admin.html` → `src/main.jsx` — full app, admin mode requires PIN

Both mount the same `App` component; `viewerOnly={true}` is the only difference. The `isAdmin` boolean (set after PIN entry) gates all write operations throughout the app.

The underscore prefix on source HTML files prevents GitHub Pages from serving them directly. The root `index.html` is a plain redirect to `v2/index.html`.

### State and sync

All tournament state lives in a single Firebase Realtime Database node: `current_tournament`. The admin writes; viewers read via `onValue`.

**Write helpers in `src/firebase.js`:**
- `pushSnapshot(snap)` — full replace (used at round start, reset)
- `pushAtomicUpdate(fields)` — partial update (used for incremental changes like score entry)

Write tokens (`_writeToken`) are attached to every write and stored locally in a `Set`. The `onValue` listener skips updates that carry a token we issued, preventing echo loops.

**Local persistence:** `src/storage.js` saves the full tournament state to `localStorage` under `SAVE_KEY`. On load, if Firebase is unavailable, the app offers to restore from the saved state via `RestoreBanner`.

### Round data flow

`roundData` in Firebase stores the active round as:
```js
{ courtTeamIds: [[id,id], ...], byeIds: [id, ...], pausedTeamIds: [id, ...], courtNums: ['5','7',...] }
```

`courtNums` is the per-round court label array — it tracks which court numbers are active in the current round independently of the global `courtNumbers` list. This is important: removing court 6 from an active round [5,6,7] must not cause court 7 to display as court 6. Always filter `round.courtNums` in sync with `round.courts`.

`pendingResults` is a sub-node updated individually as scores are entered (`court_0`, `court_1`, `live_0`, `rr_0_1`, etc.). When all courts have a pending result, the round auto-completes and a new snapshot is pushed.

**normalise.js** converts Firebase's object-keyed arrays (Firebase turns `[a,b,c]` into `{0:a,1:b,2:c}`) back to real arrays before use anywhere in the app.

### Pairing algorithm (`src/algorithms/`)

`generateRound(allSt, numCourts, roundIdx, history, pausedIds, finalRound, fullSt)`

- **Seeded phase (round 1 only):** pairs team[i] vs team[n/2+i] by registration order. Teams whose seeded partner is paused sit out.
- **Swiss phase:** greedy rank-based pairing with adjacent-swap optimisation to minimise repeat matchups. Penalty: immediate repeat ×100,000, prior repeat ×1,000.
- **Byes:** greedy selection preferring most-played teams, minimising repeat bye partnerships.
- **Social courts:** excluded before `generateRound` is called. Filter `courtNumbers` by `socialCourts` to get `compCourts`, pass `compCourts.length` as `numCourts`.

Standings are rebuilt from scratch from history on every change (`rebuildStandings`); no incremental updates.

### Key data shapes

**Team:** `{ id, name, color, text }` — `color` is hex background, `text` is hex foreground  
**Round entry in history:** `{ roundNum, games: [{winnerId, loserId, winnerScore, loserScore, courtNumber}], bye: [id,...], paused: [id,...] }`  
**Standings entry:** `{ id, wins, losses, played, scoreDiff }`

### PIN authentication

Admin PIN is stored as a SHA-256 hex string at `config/adminPin` in Firebase. `PinModal` hashes the entered PIN with `crypto.subtle.digest` before comparing. The PIN is loaded once at startup via a one-time `get()` call.

### Social courts

`socialCourts` is an array of court name strings stored in the tournament snapshot. Courts marked social are excluded from `generateRound`, and displayed below competitive courts with a SOCIAL banner during active rounds (visible to both admin and viewers).
