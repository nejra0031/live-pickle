import { useState, useMemo } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';
import { buildDUPRRows, buildDUPRCsv, downloadCsv } from '../algorithms/duprExport';

const todayStr = () => new Date().toISOString().slice(0, 10);

const iS = { padding: '8px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };

export default function ExportDUPRModal({ history, tournamentMode, tptTeams, tptPlayers, tournamentTitle, onClose }) {
  const teamById = useTeamById();
  const [eventName, setEventName] = useState(tournamentTitle || 'Tournament');
  const [date, setDate] = useState(todayStr());
  const [location, setLocation] = useState('');

  const { rows, skipped } = useMemo(
    () => buildDUPRRows({ history, tournamentMode, tptTeams, tptPlayers, teamById }),
    [history, tournamentMode, tptTeams, tptPlayers, teamById]
  );

  const doExport = () => {
    const csv = buildDUPRCsv(rows, { eventName: eventName.trim() || 'Tournament', date, location: location.trim() });
    downloadCsv(`dupr_export_${date}.csv`, csv);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4 modal-box" onClick={e => e.stopPropagation()}>
        <div className="text-sm font-bold text-indigo-300 uppercase tracking-widest">📤 Export to DUPR</div>

        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Event name</p>
          <input value={eventName} onChange={e => setEventName(e.target.value)} style={iS} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Date</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={iS} />
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1 font-bold uppercase tracking-wide">Location</p>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Madison Square Garden, New York, NY" style={iS} />
        </div>

        <p className="text-xs" style={{ color: rows.length > 0 ? '#a5b4fc' : '#fb923c' }}>
          {rows.length} game{rows.length !== 1 ? 's' : ''} ready to export
          {skipped > 0 ? ` · ${skipped} skipped (missing player names/DUPR IDs)` : ''}
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={doExport} disabled={rows.length === 0} className="flex-1 py-2 rounded-xl text-sm font-bold btn-indigo"
            style={rows.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
