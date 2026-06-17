import type { Player } from '../types';

// Nickname-first display name for a player record ({ name, nickname }).
export function playerDisplayName(player: Player | null | undefined): string {
  return player?.nickname || player?.name || '';
}
