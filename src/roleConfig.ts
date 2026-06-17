import type { RoleId, Permission } from './types';

// Role definitions — add or modify roles here without touching the rest of the codebase.
// Each role needs: id, title, icon, firebasePinsPath, button styles, and a permissions map.
export const ROLES = [
  {
    id: 'admin' as RoleId,
    title: 'Admin',
    icon: '🔓',
    firebasePinsPath: 'adminPins',
    btnBg: 'rgba(251,191,36,0.18)',
    btnColor: '#92400e',
    btnBorder: 'rgba(251,191,36,0.5)',
    permissions: {
      canSubmitResults: true,
      canPauseTeams: true,
      canToggleTimer: true,
      canSelectRRTeams: true,
      canSwitchTournamentMode: true,
      canSetFinalRound: true,
      canGenerateRound: true,
      canEditTimer: true,
      canEditActiveCourt: true,
      canLiveAddGame: true,
      canPresetMatch: true,
      canEditCourts: true,
      canEditTeams: true,
      canEditEventInfo: true,
      canEditStandingsOrder: true,
      canBreakTournament: true,
      canFinishTournament: true,
      canResetTournament: true,
      canEditHistoryScores: true,
      canDeleteHistoryGame: true,
      canFullEditHistory: true,
      canExitRRWithOwnPin: true,
      canExportDUPR: true,
    } as Record<Permission, boolean>,
  },
  {
    id: 'referee' as RoleId,
    title: 'Referee',
    icon: '🏓',
    firebasePinsPath: 'refereePins',
    btnBg: 'rgba(99,102,241,0.12)',
    btnColor: '#4338ca',
    btnBorder: 'rgba(99,102,241,0.35)',
    permissions: {
      canSubmitResults: true,
      canPauseTeams: true,
      canToggleTimer: true,
      canSelectRRTeams: true,
      canSwitchTournamentMode: false,
      canSetFinalRound: false,
      canGenerateRound: true,
      canEditTimer: false,
      canEditActiveCourt: false,
      canLiveAddGame: false,
      canPresetMatch: false,
      canEditCourts: false,
      canEditTeams: false,
      canEditEventInfo: false,
      canEditStandingsOrder: false,
      canBreakTournament: false,
      canFinishTournament: false,
      canResetTournament: false,
      canEditHistoryScores: true,
      canDeleteHistoryGame: false,
      canFullEditHistory: false,
      canExitRRWithOwnPin: false,
      canExportDUPR: false,
    } as Record<Permission, boolean>,
  },
];

export const ROLE_MAP = Object.fromEntries(ROLES.map((r) => [r.id, r])) as Record<
  RoleId,
  (typeof ROLES)[0]
>;

export function hasPermission(role: string | null | undefined, permission: string): boolean {
  if (!role) return false;
  return (ROLE_MAP as Record<string, any>)[role]?.permissions[permission] ?? false;
}
