# Admin app review

---

## Bugs / broken functionality

### 1. Remove active court is a dead prop
`onRemoveActiveCourt` is defined in `App.jsx` and accepted in `PlayTab.jsx`, but never wired to any button in `PlayTab`. Courts cannot actually be removed during a round — the PIN flow is set up but unreachable.
- **Fix:** Add a per-court remove button in the active-round `CourtCard` row

### 2. Add game silently does nothing in one edge case
In `handleAddGameSave` (App.jsx ~669), when `target === 'active'` and there is no active round AND no history yet, the game is silently discarded — no error, no feedback. Shouldn't happen in normal flow, but easy to hit if the admin adds a game too early.
- **Fix:** Guard the case and disable the button

### 3. Auto-generated court name can be a duplicate
`ManageCourtsModal → addCourt` generates `String(local.length + 1)` as the new name. If courts are [1, 3] and you click "+ Add Court", it generates "3" — immediately a duplicate — and the Save button is disabled with no explanation.
- **Fix:** Find the next unused integer

### 4. PIN loads silently broken if Firebase fails
In `App.jsx` (line 189), a Firebase error during PIN load calls `setAdminPinLoaded(true)` but leaves `adminPin` as `null`. The PIN modal becomes usable, but every attempt flashes "Incorrect PIN" with no indication that the PIN couldn't be loaded. Admin is locked out with no way to know why.
- **Fix:** Set a separate error state (`pinLoadError`) and display a distinct message in the modal: "Could not load PIN — check connection."

---

## UX problems

### 5. AddGameModal / EditGameModal layout is confusing
Both modals use:  
`[Team A chips] → [Score A row] → VS → [Score B row] → [Team B chips]`  
The score inputs are sandwiched between the two team selectors, so it's not obvious which score belongs to which team until you read it carefully. Scores should sit directly next to their team.
- **Suggestion:** Put each team and its score on the same row: `[chip selector] / [team name preview + score input]`, then VS between.

### 6. Admin lock button has no label when locked
The header button shows only `🔒` when the user is not yet an admin. A first-time user on the admin page has no idea what tapping the padlock does. Only after becoming admin does it show `🔓 Admin`.
- **Fix:** Change the locked state to `🔒 Admin login`

### 8. Firebase error toast doesn't auto-dismiss
The red error toast at the bottom has a close button but never auto-clears. A transient network blip leaves the error on screen until the user manually dismisses it.
- **Fix:** Auto-dismiss after ~5 seconds (with a `setTimeout` that clears on manual dismiss too).

### 9. Custom court input silently ignores duplicates in SetupScreen
In `SetupScreen → addCourt`, if you type a court name that already exists, the input just clears with no message. The user doesn't know why nothing happened.
- **Fix:** Show a short inline note: "Court already added."

### 10. Manage Teams has no way to remove a team
The modal lets you pause a team (excludes them from rotation but keeps their record) and add a team, but there's no button to fully remove a team from the tournament. Pausing is easy to overlook as a solution.
- **Fix:** Add a remove button per team with a warning that their history is preserved.

### 11. "Back to setup" understates the consequence
The underlined link says "↩ Back to setup" but it resets the entire tournament (all data lost). The confirm dialog does explain this, but the trigger text is too casual for a destructive action.
- **Fix:** Change link text to "↩ Reset tournament…" to set expectations before the confirm dialog.

### 12. "Cancel Round" sits visually alongside minor actions
In the Round Options panel, "✕ Cancel Round" (destructive, PIN-gated) and "🏁 Finish Tournament" appear in the same flex-wrap row as "🔀 Regenerate" and "☕ Break". A misclick is easy.
- **Fix:** Separate destructive actions (Cancel Round, Back to Setup) below a divider or put them in a collapsed "Danger" section.

---

## Minor / polish

### 13. Final Round toggle during an active round is misleading
The "🏁 Final Round: On/Off" toggle appears in Round Options while a round is in progress. It has no effect on the current round — only the next one — but there's no label saying that. Users may think toggling it mid-round changes something now.
- **Fix:** Add a note: "Applies to the next round" or move the toggle to the between-rounds screen only.

### 15. ManageCourtsModal doesn't warn when reducing courts mid-RR
If you reduce the court count below what the active Round Robin schedule was generated for, the schedule's later matches will reference court indices that no longer exist. No warning is shown.
- **Fix:** If `tournamentMode === 'roundrobin'`, show a warning when the court count would drop below `roundRobinCourts.length`.

### 16. PinModal gives same error for wrong PIN and no PIN configured
If `adminPin` is null (not set in DB), the modal flashes "Incorrect PIN" — the same message as a wrong guess. An admin who hasn't set a PIN in Firebase will be confused.
- **Fix:** Distinguish the two cases. If `pinLoaded && !correctPin`, show "No PIN is configured in the database."

### 18. EditGameModal court field saves silently if left blank
If the court name is cleared and the form is saved, `courtNum.trim() || game.courtNumber` silently falls back to the original value. The input shows empty, Save succeeds, nothing visibly changes. The user doesn't know the empty value was ignored.
- **Fix:** Validate and disable Save if the court name is empty, same as `EditActiveCourtModal` does.
