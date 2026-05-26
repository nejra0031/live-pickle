import { hasPermission } from '../roleConfig';
import TournamentFinished from './play/TournamentFinished';
import RoundRobinSection from './play/RoundRobinSection';
import BetweenRounds from './play/BetweenRounds';
import ActiveRound from './play/ActiveRound';

export default function PlayTab(props) {
  const isAdmin   = hasPermission(props.role, 'canResetTournament');
  const isReferee = !isAdmin && hasPermission(props.role, 'canSubmitResults');
  const enriched  = { ...props, isAdmin, isReferee };

  if (props.tournamentFinished) return <TournamentFinished {...enriched} />;

  if (props.tournamentMode === 'roundrobin' && props.roundRobinSchedule) {
    return <RoundRobinSection {...enriched} />;
  }

  if (!props.round) return <BetweenRounds {...enriched} />;

  return <ActiveRound {...enriched} />;
}
