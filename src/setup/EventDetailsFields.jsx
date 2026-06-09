// Shared "Location / Start day & time / Duration" inputs used by both the
// Swiss and 3-Player Team setup screens — kept in one place so the fields
// (and the shape passed to onStart) stay consistent across both.
const iS = { padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.12)', color: '#1e293b', outline: 'none' };
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parseDT(v) {
  if (!v) return { date: '', hour: 8, min: 0 };
  const [date, time = ''] = v.split('T');
  const [h, m] = time.split(':').map(Number);
  return { date, hour: isNaN(h) ? 8 : h, min: Math.round((isNaN(m) ? 0 : m) / 5) * 5 % 60 };
}

export default function EventDetailsFields({ location, setLocation, startTime, setStartTime, durationMins, setDurationMins, maxPlayers, setMaxPlayers }) {
  const { date, hour, min } = parseDT(startTime);
  const setDT = (d, h, m) => setStartTime(d ? `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : '');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Location</p>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Lakeside Courts"
          style={{ ...iS, width: '100%' }} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Start day &amp; time</p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={date} onChange={e => setDT(e.target.value, hour, min)}
            onWheel={e => e.currentTarget.blur()}
            style={{ ...iS, flex: '1 1 auto', minWidth: 110 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select value={hour} onChange={e => setDT(date, Number(e.target.value), min)} style={iS}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
              ))}
            </select>
            <span style={{ color: '#64748b', fontWeight: 900, fontSize: 15 }}>:</span>
            <select value={min} onChange={e => setDT(date, hour, Number(e.target.value))} style={iS}>
              {MINUTES.map(m => (
                <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        </div>
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
      <div>
        <p className="text-sm font-bold text-slate-700 mb-1">Max. players</p>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={999} value={maxPlayers || ''}
            onChange={e => setMaxPlayers(Math.max(0, Number(e.target.value) || 0))}
            placeholder="0" style={{ ...iS, width: 80, textAlign: 'center' }} />
          <span className="text-slate-600 text-sm">players</span>
        </div>
      </div>
    </div>
  );
}
