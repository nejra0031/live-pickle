// Role definitions — add or modify roles here without touching the rest of the codebase.
// Each role needs: id, title, icon, firebasePinPath, button styles, and a permissions map.
export const ROLES = [
  {
    id: 'admin',
    title: 'Admin',
    icon: '🔓',
    firebasePinPath: 'config/adminPin',
    btnBg: 'rgba(251,191,36,0.18)',
    btnColor: '#92400e',
    btnBorder: 'rgba(251,191,36,0.5)',
    permissions: {
      canSubmitResults:   true,
      canTogglePause:     true,
      canSelectRRTeams:   true,
      canSetFinalRound:   true,
      canGenerateRound:   true,
      canEditTimer:       true,
      canEditActiveCourt: true,
      canLiveAddGame:     true,
      canPresetMatch:     true,
      canEditCourts:      true,
      canEditTeams:       true,
      canBreakTournament: true,
      canFinishTournament: true,
      canResetTournament: true,
      canEditHistoryScores: true,
      canDeleteHistoryGame: true,
      canFullEditHistory:   true,
      canExitRRWithOwnPin: false,
    },
  },
  {
    id: 'referee',
    title: 'Referee',
    icon: '🏓',
    firebasePinPath: 'config/refereePin',
    btnBg: 'rgba(99,102,241,0.12)',
    btnColor: '#4338ca',
    btnBorder: 'rgba(99,102,241,0.35)',
    permissions: {
      canSubmitResults:   true,
      canTogglePause:     true,
      canSelectRRTeams:   true,
      canSetFinalRound:   true,
      canGenerateRound:   false,
      canEditTimer:       false,
      canEditActiveCourt: false,
      canLiveAddGame:     false,
      canPresetMatch:     false,
      canEditCourts:      false,
      canEditTeams:       false,
      canBreakTournament: false,
      canFinishTournament: false,
      canResetTournament: false,
      canEditHistoryScores: false,
      canDeleteHistoryGame: false,
      canFullEditHistory:   false,
      canExitRRWithOwnPin: true,
    },
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r]));

export function hasPermission(role, permission) {
  if (!role) return false;
  return ROLE_MAP[role]?.permissions[permission] ?? false;
}
