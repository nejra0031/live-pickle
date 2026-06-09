import { useState } from 'react';
import PlayerNameField from '../components/PlayerNameField';
import useKnownPlayers from '../hooks/useKnownPlayers';

export default function ManageDoublesRRPlayersModal({ doublesRRPlayers, onSave, onClose }) {
  const [localPlayers, setLocalPlayers] = useState(
    Object.fromEntries(Object.entries(doublesRRPlayers).map(([id, p]) => [id, { duprId: '', nickname: '', ...p }]))
  );
  const { players: knownPlayers, save: saveKnownPlayer } = useKnownPlayers();

  const updatePlayer = (playerId, val) =>
    setLocalPlayers(p => ({ ...p, [playerId]: { ...p[playerId], name: val.name, duprId: val.duprId, nickname: val.nickname ?? p[playerId].nickname } }));

  const save = () => {
    const newPlayers = Object.fromEntries(
      Object.entries(localPlayers).map(([id, p]) => [id, { ...p, name: p.name.trim() || id, duprId: (p.duprId || '').trim(), nickname: (p.nickname || '').trim() }])
    );
    Object.values(newPlayers).forEach(p => saveKnownPlayer(p.name, p.duprId, p.nickname));
    onSave(newPlayers);
  };

  const iS = { flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">✏️ Manage Players</div>

        <div className="flex flex-col gap-3" style={{ maxHeight: 420, overflowY: 'auto' }}>
          {Object.values(localPlayers).map(p => (
            <div key={p.id} className="rounded-xl p-3 flex items-center gap-2"
              style={{ border: `1px solid ${p.color || '#64748b'}44`, background: `${p.color || '#64748b'}18` }}>
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color || '#64748b' }} />
              <div style={{ flex: 1 }}>
                <PlayerNameField name={p.name} duprId={p.duprId || ''} nickname={p.nickname || ''} knownPlayers={knownPlayers}
                  onChange={val => updatePlayer(p.id, val)} inputStyle={iS} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
