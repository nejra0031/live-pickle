import { useState } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';

export default function SelectRoundRobinTeamsModal({ rankedTeamIds, tournamentCourts, onConfirm, onClose }) {
  const teamById = useTeamById();
  const [selectedTeams, setSelectedTeams] = useState(() => new Set());
  const [selectedCourts, setSelectedCourts] = useState(() => new Set());

  const toggleTeam = id => setSelectedTeams(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleCourt = c => setSelectedCourts(p => { const n = new Set(p); if (n.has(c)) n.delete(c); else n.add(c); return n; });

  const teamCount = selectedTeams.size, courtCount = selectedCourts.size;
  const canConfirm = teamCount >= 2 && courtCount >= 1;
  const orderedCourts = tournamentCourts.filter(c => selectedCourts.has(c));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">🔁 Start Round Robin</div>

        <div>
          <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Teams (standings order)</p>
          <div className="flex flex-col gap-2" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {rankedTeamIds.map((id, i) => {
              const t = teamById(id); if (!t) return null;
              const sel = selectedTeams.has(id);
              return (
                <button key={id} onClick={() => toggleTeam(id)}
                  className="flex items-center gap-3 rounded-xl text-left"
                  style={{ padding: '8px 12px', cursor: 'pointer', background: sel ? `${t.color}22` : 'rgba(255,255,255,0.04)', border: `1.5px solid ${sel ? t.color : 'rgba(255,255,255,0.1)'}` }}>
                  <span className="font-bold text-slate-500" style={{ width: 24, fontSize: 12 }}>#{i + 1}</span>
                  <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, background: sel ? t.color : 'transparent', border: `2px solid ${sel ? t.color : 'rgba(255,255,255,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 10, fontWeight: 900 }}>{sel ? '✓' : ''}</span>
                  <span className="inline-flex items-center rounded-full font-bold flex-1"
                    style={{ background: t.color, color: t.text, padding: '4px 10px', fontSize: 13, opacity: sel ? 1 : 0.55 }}>
                    {t.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{teamCount} of {rankedTeamIds.length} team{rankedTeamIds.length !== 1 ? 's' : ''} selected</p>
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-2 font-bold uppercase tracking-wide">Courts to use</p>
          <div className="flex flex-wrap gap-2">
            {tournamentCourts.map(c => {
              const sel = selectedCourts.has(c);
              return (
                <button key={c} onClick={() => toggleCourt(c)}
                  className="rounded-full font-bold"
                  style={{ padding: '5px 12px', fontSize: 12, cursor: 'pointer', background: sel ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.04)', color: sel ? '#a5b4fc' : '#64748b', border: `2px solid ${sel ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                  {c}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1">{courtCount} of {tournamentCourts.length} court{tournamentCourts.length !== 1 ? 's' : ''} selected</p>
        </div>

        {!canConfirm && <p className="text-xs text-amber-400 text-center">{teamCount < 2 ? 'Need at least 2 teams.' : 'Need at least 1 court.'}</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={() => canConfirm && onConfirm([...selectedTeams], orderedCourts)} disabled={!canConfirm}
            className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{ background: canConfirm ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)', color: canConfirm ? '#fff' : '#475569', cursor: canConfirm ? 'pointer' : 'not-allowed', border: 'none' }}>
            Start →
          </button>
        </div>
      </div>
    </div>
  );
}
