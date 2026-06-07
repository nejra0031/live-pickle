// Shared "Location / Start day & time / Duration" inputs used by both the
// Swiss and 3-Player Team setup screens — kept in one place so the fields
// (and the shape passed to onStart) stay consistent across both.
const iS = { padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', color: '#1e293b', outline: 'none' };

export default function EventDetailsFields({ location, setLocation, startTime, setStartTime, durationMins, setDurationMins }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Location</p>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lakeside Courts"
          style={{ ...iS, width: '100%' }} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Start day &amp; time</p>
        <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          style={{ ...iS, width: '100%' }} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Duration</p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={999} value={durationMins || ''}
            onChange={e => setDurationMins(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0" style={{ ...iS, width: 80, textAlign: 'center' }} />
          <span className="text-slate-600 text-sm">minutes</span>
        </div>
      </div>
    </div>
  );
}
