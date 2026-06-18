import { useState } from 'react';
import NumInput from '../components/NumInput';

// A single side's display chip + score input. `side` is { label, color, text }.
interface SideRowProps { side: any; score: string; onScoreChange: (v: string) => void }
function SideRow({ side, score, onScoreChange }: SideRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{
          background: side?.color ? `${side.color}18` : 'rgba(0,0,0,0.04)',
          border: `1.5px solid ${side?.color || 'var(--border)'}`,
        }}
      >
        {side?.color && (
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: side.color }}
          />
        )}
        <span className="font-bold text-sm flex-1" style={{ color: 'var(--ink)' }}>
          {side?.label ?? '—'}
        </span>
      </div>
      <NumInput value={score} onChange={onScoreChange} />
    </div>
  );
}

// Unified score-edit modal for Swiss/Round-Robin, TPT, and Doubles RR games.
//
// `sideA`/`sideB` are { id, label, color, text } describing the two sides as they
// stand today. When `teamPicker` is provided (Swiss/RR full edit only), the sides
// become re-pairable via chip pickers drawn from `teamPicker.allTeamIds`, and a
// court-number field is shown. Otherwise the sides and court are fixed and only
// the scores can be edited.
export default function EditGameModal({
  label,
  sideA,
  sideB,
  scoreA0,
  scoreB0,
  courtNum0,
  teamPicker,
  onSave,
  onClose,
}: {
  label: any;
  sideA: any;
  sideB: any;
  scoreA0: any;
  scoreB0: any;
  courtNum0?: any;
  teamPicker?: any;
  onSave: any;
  onClose: any;
}) {
  const [teamAId, setTeamAId] = useState(sideA.id);
  const [teamBId, setTeamBId] = useState(sideB.id);
  const [scoreA, setScoreA] = useState(scoreA0);
  const [scoreB, setScoreB] = useState(scoreB0);
  const [courtNum, setCourtNum] = useState(courtNum0 ?? '');

  const editable = !!teamPicker;

  const scoresValid = scoreA !== '' && scoreB !== '' && Number(scoreA) !== Number(scoreB);
  const teamsValid = !editable || (teamAId && teamBId && teamAId !== teamBId);
  const courtValid = !editable || courtNum.trim() !== '';
  const valid = scoresValid && teamsValid && courtValid;
  const aWins = valid && Number(scoreA) > Number(scoreB);
  const newWinnerScore = valid ? Math.max(Number(scoreA), Number(scoreB)) : null;
  const newLoserScore = valid ? Math.min(Number(scoreA), Number(scoreB)) : null;
  const teamsChanged = editable && (teamAId !== sideA.id || teamBId !== sideB.id);

  const displayA = editable
    ? { ...teamPicker.getTeam(teamAId), label: teamPicker.formatLabel(teamAId) }
    : sideA;
  const displayB = editable
    ? { ...teamPicker.getTeam(teamBId), label: teamPicker.formatLabel(teamBId) }
    : sideB;
  const winnerLabel = aWins ? displayA.label : displayB.label;

  const save = () => {
    if (!valid) return;
    onSave({
      scoreA: Number(scoreA),
      scoreB: Number(scoreB),
      aWins,
      ...(editable ? { teamAId, teamBId, courtNum: courtNum.trim() } : {}),
    });
  };

  const chipBtn = (id: string, active: boolean, onClick: () => void) => {
    const t = teamPicker.getTeam(id);
    if (!t) return null;
    return (
      <button
        key={id}
        onClick={onClick}
        style={{
          padding: '5px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          background: active ? t.color + 'bb' : 'rgba(0,0,0,0.05)',
          color: active ? t.text : 'var(--muted)',
          border: `2px solid ${active ? t.color : 'var(--border)'}`,
        }}
      >
        {teamPicker.formatLabel(id)}
      </button>
    );
  };

  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-5 my-4 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label} — Edit{editable ? '' : ' scores'}
        </div>

        {editable && (
          <div>
            <p className="modal-label">Court</p>
            <input
              value={courtNum}
              onChange={(e) => setCourtNum(e.target.value)}
              className="input-dark w-full"
              style={{
                fontSize: 14,
                padding: '6px 10px',
                border: `1px solid ${courtValid ? 'var(--border)' : '#ef4444'}`,
              }}
            />
            {!courtValid && <p className="text-xs mt-1" style={{ color: '#d97706' }}>Court name is required.</p>}
          </div>
        )}

        {editable ? (
          <>
            <div className="flex flex-col gap-2">
              <p className="modal-label">Team A</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {teamPicker.allTeamIds.map((id: string) =>
                  chipBtn(id, teamAId === id, () => {
                    setTeamAId(id);
                    if (teamBId === id) setTeamBId(teamAId);
                  })
                )}
              </div>
              <SideRow side={displayA} score={scoreA} onScoreChange={setScoreA} />
            </div>

            <div className="text-center text-xs font-bold" style={{ color: 'var(--muted)', letterSpacing: '0.1em' }}>VS</div>

            <div className="flex flex-col gap-2">
              <p className="modal-label">Team B</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
                {teamPicker.allTeamIds.map((id: string) =>
                  chipBtn(id, teamBId === id, () => {
                    setTeamBId(id);
                    if (teamAId === id) setTeamAId(teamBId);
                  })
                )}
              </div>
              <SideRow side={displayB} score={scoreB} onScoreChange={setScoreB} />
            </div>
          </>
        ) : (
          <>
            <SideRow side={sideA} score={scoreA} onScoreChange={setScoreA} />
            <div className="text-center text-xs font-bold" style={{ color: 'var(--muted)', letterSpacing: '0.1em' }}>VS</div>
            <SideRow side={sideB} score={scoreB} onScoreChange={setScoreB} />
          </>
        )}

        {teamsChanged && (
          <div className="notice-amber">
            ⚠️ Teams changed — byes for this round will be recalculated.
          </div>
        )}
        {valid && (
          <p className="text-xs text-center" style={{ color: '#16a34a' }}>
            → {winnerLabel} wins {newWinnerScore}–{newLoserScore}
          </p>
        )}
        {!scoresValid && scoreA !== '' && scoreB !== '' && (
          <p className="text-xs text-center" style={{ color: '#d97706' }}>Scores can't be equal.</p>
        )}
        {editable && !teamsValid && teamAId === teamBId && (
          <p className="text-xs text-center" style={{ color: '#d97706' }}>Teams must be different.</p>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!valid}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

