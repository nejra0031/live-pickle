// Domain types for live-pickle.
// Mirror existing shapes exactly — do not rename fields or change defaults.
// These types are the compile-time contract for buildSnapshot / snapshotToState.

// ── Primitives ─────────────────────────────────────────────────────────────

export type TournamentMode = 'swiss' | 'roundrobin' | 'tpt' | 'doublesrr';

export type TeamNameDisplay = 'name' | 'players' | 'both';

export type TiebreakKey = 'wins' | 'scoreDiff' | 'headToHead';

// ── Players & teams ────────────────────────────────────────────────────────

export interface Player {
  name: string;
  nickname?: string;
  duprId?: string;
}

/** Swiss / round-robin team. `players` is present on fixed-partner teams. */
export interface Team {
  id: string;
  name: string;
  color: string;
  text: string;
  players?: Player[];
}

// ── Games & history ────────────────────────────────────────────────────────

export interface Game {
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
  courtNumber: string;
}

/** One entry in the history array (one completed round). */
export interface RoundEntry {
  roundNum: number;
  games: Game[];
  bye: string[];
  paused: string[];
  tptMatchups?: TPTMatchup[];
  doublesRRCourts?: DoublesRRCourtResult[];
}

// ── In-memory active round (App.jsx ~line 250) ─────────────────────────────

export interface ActiveRound {
  courts: [Team, Team][];
  bye: Team[];
  paused: Team[];
  courtNums: string[];
}

// ── Standings ──────────────────────────────────────────────────────────────

export interface Standing {
  id: string;
  name?: string;
  color?: string;
  text?: string;
  wins: number;
  losses: number;
  played: number;
  scoreDiff: number;
  lastByeRound?: number;
}

// ── TPT (Three-Player Team) ─────────────────────────────────────────────────

export interface TPTTeam {
  id: string;
  name: string;
  color: string;
  text: string;
  maleIds: [string, string];
  femaleId: string;
}

export interface TPTPlayer {
  id: string;
  name: string;
  gender: 'male' | 'female';
}

export interface TPTGame {
  winnerTeamId: string;
  loserTeamId: string;
  winnerScore: number;
  loserScore: number;
}

export interface TPTMatchup {
  teamAId: string;
  teamBId: string;
  games: TPTGame[];
}

/** One entry in tptSchedule: matchups for that round plus an optional bye team. */
export interface TPTScheduleRound {
  matchups: Array<{ teamAId: string; teamBId: string }>;
  byeTeamId: string | null;
}

export type TPTSchedule = TPTScheduleRound[];

/** Keyed by "roundIdx_matchupIdx_gameIdx" */
export type TPTResults = Record<
  string,
  { winnerTeamId: string; loserTeamId: string; winnerScore: number; loserScore: number }
>;

export type TPTSubstitutions = Record<string, unknown>;

// ── Doubles RR ─────────────────────────────────────────────────────────────

export interface DoublesRRPlayer {
  id: string;
  name: string;
  color: string;
  text: string;
  duprId?: string;
}

/** One 2v2 court in a Doubles RR round: { teamA: [p1,p2], teamB: [p3,p4] } */
export interface DoublesRRCourt {
  teamA: string[];
  teamB: string[];
}

/** One Doubles RR round: courts plus any bye players. */
export interface DoublesRRScheduleRound {
  courts: DoublesRRCourt[];
  byePlayerIds: string[];
}

export type DoublesRRSchedule = DoublesRRScheduleRound[];

export interface DoublesRRCourtResult {
  winnerIds: [string, string];
  loserIds: [string, string];
  winnerScore: number;
  loserScore: number;
  teamA?: [string, string];
  teamB?: [string, string];
}

/** Keyed by "roundIdx_courtIdx" */
export type DoublesRRResults = Record<string, DoublesRRCourtResult>;

// ── Round-robin schedule ────────────────────────────────────────────────────

export type RoundRobinSchedule = Array<Array<[string, string]>>;

/** Marker written when swiss→round-robin transition occurs. */
export interface RoundRobinStartSnapshot {
  startRoundNum: number;
  participatingIds: string[];
  excludedIds: string[];
}

/** Marker written when round-robin completes and admin returns to swiss. */
export interface RoundRobinEndSnapshot {
  endRoundNum: number;
  endReason: string;
}

// ── Roles & permissions ─────────────────────────────────────────────────────

export type RoleId = 'admin' | 'referee';

export type Permission =
  | 'canSubmitResults'
  | 'canPauseTeams'
  | 'canToggleTimer'
  | 'canSelectRRTeams'
  | 'canSwitchTournamentMode'
  | 'canSetFinalRound'
  | 'canGenerateRound'
  | 'canEditTimer'
  | 'canEditActiveCourt'
  | 'canLiveAddGame'
  | 'canPresetMatch'
  | 'canEditCourts'
  | 'canEditTeams'
  | 'canEditEventInfo'
  | 'canEditStandingsOrder'
  | 'canBreakTournament'
  | 'canFinishTournament'
  | 'canResetTournament'
  | 'canEditHistoryScores'
  | 'canDeleteHistoryGame'
  | 'canFullEditHistory'
  | 'canExitRRWithOwnPin'
  | 'canExportDUPR';

// ── Reducer state (mirrors TOURNAMENT_INITIAL in App.jsx) ──────────────────

export interface TournamentState {
  tournamentTitle: string;
  tournamentLocation: string;
  tournamentStartTime: string;
  tournamentDurationMins: number;
  maxPlayers: number;
  activeTeamIds: string[];
  tournamentTeams: Team[];
  courtNumbers: string[];
  timerDuration: number;
  timerDefaultMins: number;
  history: RoundEntry[];
  round: ActiveRound | null;
  roundNum: number;
  pending: Record<string, unknown>;
  roundComplete: boolean;
  pausedIds: string[];
  tournamentMode: TournamentMode;
  roundRobinSchedule: RoundRobinSchedule | null;
  roundRobinCourts: string[] | null;
  roundRobinStartRoundNum: number | null;
  roundRobinStartSnapshot: RoundRobinStartSnapshot | null;
  roundRobinEndSnapshot: RoundRobinEndSnapshot | null;
  activeRoundExtras: unknown[];
  liveAdditions: unknown[];
  nextRoundPresets: unknown[];
  tournamentFinished: boolean;
  cancelledRoundNums: number[];
  finalRound: boolean;
  targetRounds: number;
  socialCourts: string[];
  teamNameDisplay: TeamNameDisplay;
  standingsTiebreakOrder: TiebreakKey[];
  tptSubstitutions: TPTSubstitutions;
}

// ── Firebase wire format (mirrors buildSnapshot return + snapshotToState reads)

export interface TournamentSnapshot {
  phase: 'play' | 'setup';
  activeTeamIds: string[];
  courtNumbers: string[];
  socialCourts: string[];
  teamRegistry: Team[];
  tournamentTitle: string;
  tournamentLocation: string;
  tournamentStartTime: string;
  tournamentDurationMins: number;
  maxPlayers: number;
  timerDuration: number;
  timerDefaultMins: number;
  history: RoundEntry[];
  roundNum: number;
  pausedIds: string[];
  roundComplete: boolean;
  timerRunning: boolean;
  timerStartedAt: number | null;
  timerPausedSecsLeft: number;
  roundData: RoundData | null;
  breakMode: string | null;
  finalRound: boolean;
  targetRounds: number;
  tournamentMode: TournamentMode;
  roundRobinSchedule: RoundRobinSchedule | null;
  roundRobinCourts: string[] | null;
  roundRobinStartRoundNum: number | null;
  roundRobinStartSnapshot: RoundRobinStartSnapshot | null;
  roundRobinEndSnapshot: RoundRobinEndSnapshot | null;
  activeRoundExtras: unknown[];
  liveAdditions: unknown[];
  nextRoundPresets: unknown[];
  tournamentFinished: boolean;
  cancelledRoundNums: number[];
  standingsTiebreakOrder: TiebreakKey[];
  savedAt: number;
  // TPT fields (optional — absent when not a TPT tournament)
  tptTeams?: TPTTeam[];
  players?: Record<string, TPTPlayer>;
  tptSchedule?: TPTSchedule;
  tptResults?: TPTResults;
  tptSubstitutions?: TPTSubstitutions;
  // Doubles RR fields (optional)
  doublesRRPlayers?: Record<string, DoublesRRPlayer>;
  doublesRRSchedule?: DoublesRRSchedule;
  doublesRRResults?: DoublesRRResults;
  doublesRRTiebreakOrder?: string[];
  teamNameDisplay?: TeamNameDisplay;
  // Meta — only on initial snapshot writes
  _tournamentId?: string;
  _writeToken?: string;
}

/** The raw Firebase `roundData` node (object-keyed arrays before normalise). */
export interface RoundData {
  courtTeamIds: Record<number, [string, string]> | [string, string][];
  byeIds: Record<number, string> | string[];
  pausedTeamIds: Record<number, string> | string[];
  courtNums: Record<number, string> | string[];
}
