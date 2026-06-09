import { useState } from 'react';
import TiebreakOrderEditor from '../components/TiebreakOrderEditor';

const iS = { padding: '8px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };

const SectionLabel = ({ children }) => (
  <p style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{children}</p>
);

export default function TournamentSettingsModal({
  tournamentTitle, tournamentLocation, tournamentStartTime, tournamentDurationMins,
  tournamentMode,
  standingsTiebreakOrder, onStandingsTiebreakOrderChange,
  doublesRRTiebreakOrder, onDoublesRRTiebreakOrderChange,
  onSaveInfo, onManageTeams, onManageCourts, onReset, onClose,
}) {
  const [title, setTitle] = useState(tournamentTitle || '');
  const [location, setLocation] = useState(tournamentLocation || '');
  const [startTime, setStartTime] = useState(tournamentStartTime || '');
  const [durationMins, setDurationMins] = useState(tournamentDurationMins || 0);

  // Save info then run action (used by all buttons that navigate away)
  const saveAndDo = (action) => {
    onSaveInfo({ title, location, startTime, durationMins });
    action();
  };

  const showStandingsOrder = tournamentMode !== null;
  const tiebreakOrder = tournamentMode === 'doublesrr' ? doublesRRTiebreakOrder : standingsTiebreakOrder;
  const onTiebreakChange = tournamentMode === 'doublesrr' ? onDoublesRRTiebreakOrderChange : onStandingsTiebreakOrderChange;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-5 my-4 modal-box" onClick={e => e.stopPropagation()}
        style={{ maxHeight: '85vh', overflowY: 'auto' }}>

        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">Tournament Settings</div>

        {/* ── Event info ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel>Event info</SectionLabel>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Tournament name</p>
            <input value={title} onChange={e => setTitle(e.target.value)} style={iS} placeholder="Tournament" />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Location</p>
            <input value={location} onChange={e => setLocation(e.target.value)} style={iS} placeholder="e.g. Lakeside Courts" />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Start date &amp; time</p>
            <StartTimePicker startTime={startTime} setStartTime={setStartTime} />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Duration</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={999} value={durationMins || ''} placeholder="0"
                onChange={e => setDurationMins(Math.max(0, Number(e.target.value) || 0))}
                style={{ ...iS, width: 80, textAlign: 'center' }} />
              <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>minutes</span>
            </div>
          </div>
        </div>

        {/* ── Standings order ── */}
        {showStandingsOrder && (
          <div>
            <SectionLabel>Standings order</SectionLabel>
            <div className="rounded-xl" style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <TiebreakOrderEditor order={tiebreakOrder} onChange={onTiebreakChange} />
            </div>
          </div>
        )}

        {/* ── Management ── */}
        <div className="flex flex-col gap-2">
          <SectionLabel>Management</SectionLabel>
          <button onClick={() => saveAndDo(onManageTeams)}
            style={{ padding: 'clamp(9px,2.5vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,14px)', cursor: 'pointer', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'left' }}>
            ✏️ Manage teams &amp; players
          </button>
          <button onClick={() => saveAndDo(onManageCourts)}
            style={{ padding: 'clamp(9px,2.5vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,14px)', cursor: 'pointer', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', textAlign: 'left' }}>
            🏟️ Manage courts
          </button>
        </div>

        {/* ── Bottom buttons ── */}
        <div className="flex gap-2">
          <button onClick={() => saveAndDo(onReset)}
            style={{ flex: 1, padding: 'clamp(8px,2vw,11px)', borderRadius: 10, fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.2)' }}>
            ↩ Reset
          </button>
          <button onClick={() => saveAndDo(onClose)}
            className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

function parseDT(v) {
  if (!v) return { date: '', hour: 8, min: 0 };
  const [date, time = ''] = v.split('T');
  const [h, m] = time.split(':').map(Number);
  return { date, hour: isNaN(h) ? 8 : h, min: Math.round((isNaN(m) ? 0 : m) / 5) * 5 % 60 };
}

function StartTimePicker({ startTime, setStartTime }) {
  const { date, hour, min } = parseDT(startTime);
  const setDT = (d, h, m) => setStartTime(d ? `${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` : '');

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <input type="date" value={date} onChange={e => setDT(e.target.value, hour, min)}
        onWheel={e => e.currentTarget.blur()}
        style={{ ...iS, flex: '1 1 auto', minWidth: 110 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <select value={hour} onChange={e => setDT(date, Number(e.target.value), min)} style={{ ...iS, width: 'auto' }}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
          ))}
        </select>
        <span style={{ color: '#94a3b8', fontWeight: 900, fontSize: 15 }}>:</span>
        <select value={min} onChange={e => setDT(date, hour, Number(e.target.value))} style={{ ...iS, width: 'auto' }}>
          {MINUTES.map(m => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
