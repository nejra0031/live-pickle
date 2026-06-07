import { useState } from 'react';
import PlayerNameField from '../components/PlayerNameField';
import useKnownPlayers from '../hooks/useKnownPlayers';

export default function ManageTPTTeamsModal({ tptTeams, tptPlayers, onSave, onClose }) {
  const [localTeams, setLocalTeams] = useState(
    Object.values(tptTeams).map(t => ({ ...t }))
  );
  const [localPlayers, setLocalPlayers] = useState(
    Object.fromEntries(Object.entries(tptPlayers).map(([id, p]) => [id, { duprId: '', ...p }]))
  );
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  const updateTeamName = (teamId, name) =>
    setLocalTeams(p => p.map(t => t.id === teamId ? { ...t, name } : t));

  const updatePlayer = (playerId, val) =>
    setLocalPlayers(p => ({ ...p, [playerId]: { ...p[playerId], name: val.name, duprId: val.duprId } }));

  const save = () => {
    const newTeams = Object.fromEntries(localTeams.map(t => [t.id, { ...t, name: t.name.trim() || t.id }]));
    const newPlayers = Object.fromEntries(
      Object.entries(localPlayers).map(([id, p]) => [id, { ...p, name: p.name.trim() || id, duprId: (p.duprId || '').trim() }])
    );
    Object.values(newPlayers).forEach(p => saveKnownPlayer(p.name, p.duprId));
    onSave(newTeams, newPlayers);
  };

  const iS = { flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">✏️ Manage Teams &amp; Players</div>

        <div className="flex flex-col gap-4" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {localTeams.map(team => {
            const players = [...(team.maleIds || []), team.femaleId]
              .filter(Boolean)
              .map(pid => localPlayers[pid])
              .filter(Boolean);

            return (
              <div key={team.id} className="rounded-xl p-3 flex flex-col gap-2"
                style={{ border: `1px solid ${team.color}44`, background: `${team.color}18` }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: team.color }} />
                  <input value={team.name} onChange={e => updateTeamName(team.id, e.target.value)}
                    style={{ ...iS, fontWeight: 800, color: team.color }} />
                </div>
                {players.map(p => (
                  <div key={p.id} className="flex items-start gap-2">
                    <span style={{ fontSize: 11, color: p.gender === 'female' ? '#f9a8d4' : '#93c5fd', fontWeight: 700, width: 14, flexShrink: 0, marginTop: 8 }}>
                      {p.gender === 'female' ? '♀' : '♂'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <PlayerNameField name={p.name} duprId={p.duprId || ''} knownPlayers={knownPlayers}
                        onChange={val => updatePlayer(p.id, val)} inputStyle={iS} duprIdStyle={{ ...iS, fontSize: 12 }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
