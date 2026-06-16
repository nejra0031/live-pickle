// Nickname-first display name for a player record ({ name, nickname }).
export function playerDisplayName(player) {
  return player?.nickname || player?.name || '';
}
