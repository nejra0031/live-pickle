// Shared "All rounds complete!" block for TPT and DoublesRR play sections.
export default function TournamentCompleteBlock({ onFinish, isAdmin }) {
  if (isAdmin) {
    return (
      <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,18px)', gap: 'clamp(8px,2vw,12px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.3)' }}>
        <p className="font-black text-center" style={{ color: '#92400e', fontSize: 'clamp(15px,3.5vw,20px)', margin: 0 }}>All rounds complete!</p>
        <button onClick={onFinish} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>
          🏁 Finish Tournament
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 'clamp(28px,7vw,44px)', marginBottom: 8 }}>🏆</div>
      <p className="font-bold" style={{ color: '#0f4c75', fontSize: 'clamp(14px,3.5vw,20px)' }}>All rounds complete!</p>
    </div>
  );
}
