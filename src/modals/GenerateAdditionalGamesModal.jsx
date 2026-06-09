// Lets the admin generate a fresh full round-robin schedule for the same
// roster — re-paired with different round/court groupings where the structure
// allows — and choose how it merges with what's already there.
export default function GenerateAdditionalGamesModal({ onChoose, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>🔁 Generate Additional Games</div>
        <p className="text-sm text-slate-300">
          Generates a fresh full round-robin for the same players/teams, re-paired with different round and court groupings. Choose how to merge it:
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={() => onChoose('append')} className="w-full py-2.5 px-3 rounded-xl text-sm font-bold text-left"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)', cursor: 'pointer' }}>
            ➕ Add more rounds
            <div className="text-xs font-normal mt-1" style={{ color: '#94a3b8' }}>Keeps everything as-is and appends the new schedule to the end.</div>
          </button>
          <button onClick={() => onChoose('replace')} className="w-full py-2.5 px-3 rounded-xl text-sm font-bold text-left"
            style={{ background: 'rgba(217,119,6,0.12)', color: '#fbbf24', border: '1px solid rgba(217,119,6,0.35)', cursor: 'pointer' }}>
            🔄 Replace remaining rounds
            <div className="text-xs font-normal mt-1" style={{ color: '#94a3b8' }}>Keeps completed rounds and history, swaps out everything not yet played.</div>
          </button>
        </div>
        <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
      </div>
    </div>
  );
}
