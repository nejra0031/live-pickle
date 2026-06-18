import { useState } from 'react';
import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';

interface Props {
  courtIdx: number;
  courtNumbers: string[];
  currentCourts: any[][];
  allTeamIds: string[];
  hasPending: boolean;
  onSave: (data: { courtIdx: number; teamAId: string; teamBId: string; courtNum: string }) => void;
  onClose: () => void;
}
export default function EditActiveCourtModal({
  courtIdx, courtNumbers, currentCourts, allTeamIds, hasPending, onSave, onClose,
}: Props) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const cur = currentCourts[courtIdx] || [];
  const currentCourtNum = courtNumbers[courtIdx] ?? courtIdx + 1;
  const [teamAId, setTeamAId] = useState(cur[0]?.id || '');
  const [teamBId, setTeamBId] = useState(cur[1]?.id || '');
  const [courtNum, setCourtNum] = useState(String(currentCourtNum));

  const courtNumTrimmed = courtNum.trim();
  const teamsValid = teamAId && teamBId && teamAId !== teamBId && courtNumTrimmed !== '';

  const save = () => {
    if (!teamsValid) return;
    onSave({ courtIdx, teamAId, teamBId, courtNum: courtNumTrimmed });
  };

  const chip = (id: string, active: boolean, onClick: () => void) => {
    const t = teamById(id);
    if (!t) return null;
    return (
      <button
        key={id}
        onClick={onClick}
        style={{
          padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: active ? t.color + 'bb' : 'rgba(0,0,0,0.05)',
          color: active ? t.text : 'var(--muted)',
          border: `2px solid ${active ? t.color : 'var(--border)'}`,
        }}
      >
        {teamLabel(id)}
      </button>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 my-4 modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Court {currentCourtNum} — Edit Game
        </div>
        {hasPending && <div className="notice-amber">⚠️ Entered score will be cleared.</div>}
        <div>
          <p className="modal-label">Court Name</p>
          <input
            value={courtNum}
            onChange={(e) => setCourtNum(e.target.value)}
            className="input-dark"
            style={{ border: `1px solid ${courtNumTrimmed === '' ? 'var(--red)' : 'var(--border)'}` }}
          />
        </div>
        <div>
          <p className="modal-label">Team A</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map((id) => chip(id, teamAId === id, () => { setTeamAId(id); if (teamBId === id) setTeamBId(teamAId); }))}
          </div>
        </div>
        <div>
          <p className="modal-label">Team B</p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {allTeamIds.map((id) => chip(id, teamBId === id, () => { setTeamBId(id); if (teamAId === id) setTeamAId(teamBId); }))}
          </div>
        </div>
        {!teamsValid && teamAId === teamBId && (
          <p className="text-xs text-center" style={{ color: '#d97706' }}>Teams must be different.</p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} disabled={!teamsValid} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
