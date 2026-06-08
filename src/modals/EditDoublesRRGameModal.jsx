import { useState } from 'react';
import NumInput from '../components/NumInput';

export default function EditDoublesRRGameModal({ gameLabel, sideALabel, sideBLabel, teamAIds, teamBIds, currentResult, onSave, onClose }) {
  const aIsWinner = currentResult ? currentResult.winnerIds.join(',') === teamAIds.join(',') : null;
  const aScore0 = currentResult ? (aIsWinner ? currentResult.winnerScore : currentResult.loserScore) : '';
  const bScore0 = currentResult ? (aIsWinner ? currentResult.loserScore : currentResult.winnerScore) : '';

  const [scoreA, setScoreA] = useState(aScore0);
  const [scoreB, setScoreB] = useState(bScore0);

  const valid = scoreA !== '' && scoreB !== '' && Number(scoreA) !== Number(scoreB);
  const aWins = valid && Number(scoreA) > Number(scoreB);

  const save = () => {
    if (!valid) return;
    onSave({
      winnerIds:   aWins ? teamAIds : teamBIds,
      loserIds:    aWins ? teamBIds : teamAIds,
      winnerScore: Math.max(Number(scoreA), Number(scoreB)),
      loserScore:  Math.min(Number(scoreA), Number(scoreB)),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 my-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{gameLabel} — Edit scores</div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <span className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{sideALabel}</span>
            </div>
            <NumInput value={scoreA} onChange={setScoreA} />
          </div>
          <div className="text-center text-slate-600 text-xs font-bold">VS</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
              <span className="font-bold text-sm" style={{ color: '#e2e8f0' }}>{sideBLabel}</span>
            </div>
            <NumInput value={scoreB} onChange={setScoreB} />
          </div>
        </div>

        {valid && <p className="text-xs text-green-400 text-center">→ {aWins ? sideALabel : sideBLabel} wins {Math.max(Number(scoreA), Number(scoreB))}–{Math.min(Number(scoreA), Number(scoreB))}</p>}
        {!valid && scoreA !== '' && scoreB !== '' && <p className="text-xs text-amber-400 text-center">Scores can't be equal.</p>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={save} disabled={!valid} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">Save</button>
        </div>
      </div>
    </div>
  );
}
