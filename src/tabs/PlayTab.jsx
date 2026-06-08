import { hasPermission } from '../roleConfig';
import TournamentFinished from './play/TournamentFinished';
import RoundRobinSection from './play/RoundRobinSection';
import ThreePlayerSection from './play/ThreePlayerSection';
import DoublesRRSection from './play/DoublesRRSection';
import BetweenRounds from './play/BetweenRounds';
import ActiveRound from './play/ActiveRound';

export default function PlayTab(props) {
  const isAdmin   = hasPermission(props.role, 'canResetTournament');
  const isReferee = !isAdmin && hasPermission(props.role, 'canSubmitResults');
  const enriched  = { ...props, isAdmin, isReferee };

  if (props.tournamentFinished) return <TournamentFinished {...enriched} />;

  if (props.tournamentMode === 'tpt') {
    return (
      <ThreePlayerSection
        tptTeams={props.tptTeams} tptPlayers={props.tptPlayers}
        tptSchedule={props.tptSchedule} tptResults={props.tptResults}
        courtNumbers={props.courtNumbers} history={props.history}
        role={props.role} isAdmin={isAdmin}
        timerDuration={props.timerDuration} timerSecsLeft={props.timerSecsLeft} timerRunning={props.timerRunning}
        breakMode={props.breakMode}
        onTPTResult={props.onTPTResult}
        onFinishTournament={props.onFinishTournament} onBreakStart={props.onBreakStart} onBreakEnd={props.onBreakEnd}
        onManageTeams={props.onManageTeams} onManageCourts={props.onManageCourts} onReset={props.onReset}
        onTimerToggle={props.onTimerToggle} onTimerRestart={props.onTimerRestart} onTimerSettings={props.onTimerSettings}
      />
    );
  }

  if (props.tournamentMode === 'doublesrr') {
    return (
      <DoublesRRSection
        doublesRRPlayers={props.doublesRRPlayers} doublesRRSchedule={props.doublesRRSchedule}
        doublesRRResults={props.doublesRRResults}
        courtNumbers={props.courtNumbers} history={props.history}
        role={props.role} isAdmin={isAdmin}
        timerDuration={props.timerDuration} timerSecsLeft={props.timerSecsLeft} timerRunning={props.timerRunning}
        breakMode={props.breakMode}
        onDoublesRRResult={props.onDoublesRRResult}
        onFinishTournament={props.onFinishTournament} onBreakStart={props.onBreakStart} onBreakEnd={props.onBreakEnd}
        onManageTeams={props.onManageTeams} onManageCourts={props.onManageCourts} onReset={props.onReset}
        onTimerToggle={props.onTimerToggle} onTimerRestart={props.onTimerRestart} onTimerSettings={props.onTimerSettings}
      />
    );
  }

  if (props.tournamentMode === 'roundrobin' && props.roundRobinSchedule) {
    return <RoundRobinSection {...enriched} />;
  }

  if (!props.round) return <BetweenRounds {...enriched} />;

  return <ActiveRound {...enriched} />;
}
