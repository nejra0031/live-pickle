export default function RestoreBanner({ saved, onRestore, onDiscard }) {
  const d = new Date(saved.savedAt);
  return (
    <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3"
      style={{ background: 'rgba(15,76,117,0.08)', border: '1px solid rgba(15,76,117,0.25)' }}>
      <div>
        <p className="text-sm font-bold text-blue-800">💾 Saved tournament found</p>
        <p className="text-xs text-slate-500 mt-1">
          Round {saved.roundNum} · {saved.activeTeamIds?.length} teams · Courts {saved.courtNumbers?.join(', ')}<br />
          Saved at {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
        <p className="text-xs text-slate-400 mt-1">If the live connection is restored, it will take priority over this saved data.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onDiscard} className="flex-1 py-2 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(0,0,0,0.06)', color: '#64748b', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)' }}>
          Discard
        </button>
        <button onClick={onRestore} className="flex-1 py-2 rounded-xl text-sm font-bold btn-blue">
          Restore →
        </button>
      </div>
    </div>
  );
}
