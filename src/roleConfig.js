// Role definitions — add or modify roles here without touching the rest of the codebase.
// Each role needs: id, title, icon, firebasePinPath, button styles, and a permissions map.
export const ROLES = [
  {
    id: 'admin',
    title: 'Admin',
    icon: '🔓',
    firebasePinPath: 'adminPin',
    btnBg: 'rgba(251,191,36,0.18)',
    btnColor: '#92400e',
    btnBorder: 'rgba(251,191,36,0.5)',
    permissions: {
      canSubmitResults:   true,
      canPauseTeams:      true,
      canToggleTimer:     true,
      canSelectRRTeams:        true,
      canSwitchTournamentMode: true,
      canSetFinalRound:        true,
      canGenerateRound:        true,
      canEditTimer:            true,
      canEditActiveCourt: true,
      canLiveAddGame:     true,
      canPresetMatch:     true,
      canEditCourts:      true,
      canEditTeams:       true,
      canEditEventInfo:   true,
      canEditStandingsOrder: true,
      canBreakTournament: true,
      canFinishTournament: true,
      canResetTournament: true,
      canEditHistoryScores: true,
      canDeleteHistoryGame: true,
      canFullEditHistory:   true,
      canExitRRWithOwnPin: true,
    },
  },
  {
    id: 'referee',
    title: 'Referee',
    icon: '🏓',
    firebasePinPath: 'refereePin',
    btnBg: 'rgba(99,102,241,0.12)',
    btnColor: '#4338ca',
    btnBorder: 'rgba(99,102,241,0.35)',
    permissions: {
      canSubmitResults:   true,
      canPauseTeams:      true,
      canToggleTimer:     true,
      canSelectRRTeams:        true,
      canSwitchTournamentMode: false,
      canSetFinalRound:        false,
      canGenerateRound:        true,
      canEditTimer:            false,
      canEditActiveCourt: false,
      canLiveAddGame:     false,
      canPresetMatch:     false,
      canEditCourts:      false,
      canEditTeams:       false,
      canEditEventInfo:   false,
      canEditStandingsOrder: false,
      canBreakTournament: false,
      canFinishTournament: false,
      canResetTournament: false,
      canEditHistoryScores: true,
      canDeleteHistoryGame: false,
      canFullEditHistory:   false,
      canExitRRWithOwnPin: false,
    },
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r]));

export function hasPermission(role, permission) {
  if (!role) return false;
  return ROLE_MAP[role]?.permissions[permission] ?? false;
}
