import { useState } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';
import { ALL_TEAMS } from '../constants';

export default function ManageTeamsModal({ activeTeamIds, tournamentTeams, pausedIds = [], onTogglePause, onSave, onClose }) {
  const teamById = useTeamById();
  const [localTeams, setLocalTeams] = useState(
    activeTeamIds.map(id => {
      const t = teamById(id);
      return { id, name: t ? t.name : id, color: t ? t.color : '#475569', text: t ? t.text : '#fff' };
    })
  );
  const [addId, setAddId] = useState('');

  const usedIds = new Set(localTeams.map(t => t.id));
  const available = ALL_TEAMS.filter(t => !usedIds.has(t.id));

  const rename = (id, name) => setLocalTeams(p => p.map(t => t.id === id ? { ...t, name } : t));

  const addTeam = () => {
    if (!addId) return;
    const base = ALL_TEAMS.find(t => t.id === addId);
    if (!base) return;
    setLocalTeams(p => [...p, { id: base.id, name: base.name, color: base.color, text: base.text }]);
    setAddId('');
  };

  const save = () => {
    const registry = localTeams.map(t => {
      const orig = tournamentTeams.find(x => x.id === t.id);
      return { id: t.id, name: t.name.trim() || t.id, color: t.color, text: t.text, ...(orig ? { color: orig.color, text: orig.text } : {}) };
    });
    onSave(registry, localTeams.map(t => t.id));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">✏️ Manage Teams</div>

        {onTogglePause && (
          <div>
            <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">🩹 Team Status</p>
            <div className="flex flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {activeTeamIds.map(id => {
                const t = teamById(id), p = pausedIds.includes(id);
                return (
                  <button key={id} onClick={() => onTogglePause(id)} title={p ? 'Return to rotation' : 'Pause (injury/break)'}
                    className="flex items-center rounded-full font-bold"
                    style={{ gap: 'clamp(4px,1vw,6px)', padding: 'clamp(5px,1.2vw,8px) clamp(10px,2.5vw,16px)', fontSize: 'clamp(12px,3vw,16px)', background: p ? 'rgba(0,0,0,0.05)' : t.color, color: p ? '#94a3b8' : t.text, border: `2px solid ${p ? 'rgba(0,0,0,0.08)' : t.color}`, cursor: 'pointer', opacity: p ? 0.6 : 1, textDecoration: p ? 'line-through' : 'none' }}>
                    {p ? '⏸ ' : ''}{t.name}
                  </button>
                );
              })}
            </div>
            {pausedIds.length > 0 && (
              <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#d97706', marginTop: 'clamp(6px,1.5vw,10px)' }}>
                {pausedIds.map(id => teamById(id)?.name).join(', ')} paused — excluded from rotation.
              </p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Rename</p>
          <div className="flex flex-col gap-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {localTeams.map(t => (
              <div key={t.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <input value={t.name} onChange={e => rename(t.id, e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none' }} />
                <button onClick={() => setLocalTeams(p => p.filter(x => x.id !== t.id))}
                  title="Remove from tournament (history preserved)"
                  disabled={localTeams.length <= 2}
                  style={{ padding: '3px 7px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: localTeams.length <= 2 ? 'not-allowed' : 'pointer', background: 'rgba(220,38,38,0.12)', color: localTeams.length <= 2 ? '#475569' : '#f87171', border: '1px solid rgba(220,38,38,0.25)', flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {available.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">Add a team</p>
            <div className="flex gap-2">
              <select value={addId} onChange={e => setAddId(e.target.value)}
                style={{ flex: 1, padding: '6px 8px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none' }}>
                <option value="">— choose colour —</option>
                {available.map(t => <option key={t.id} value={t.id} style={{ background: '#1e293b' }}>{t.name}</option>)}
              </select>
              <button onClick={addTeam} disabled={!addId}
                style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: addId ? 'pointer' : 'not-allowed', background: addId ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', color: addId ? '#a5b4fc' : '#475569', border: '1px solid rgba(99,102,241,0.3)' }}>
                + Add
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">New teams start with 0 wins and join the rotation immediately.</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
