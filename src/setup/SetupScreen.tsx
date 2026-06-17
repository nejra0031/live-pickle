import { useState } from 'react';

// Each option pairs an engine `format` with a `startMode` ('swiss' starts in
// the round-by-round Swiss phase; 'roundrobin' generates the full schedule up
// front and opens directly in Round Robin mode — see App.jsx:handleStart).
// Doubles RR (rotating partners) and Trio are inherently round-robin formats —
// they always pre-generate their full schedule, so there's no Swiss variant.
const FORMAT_OPTIONS = [
  { id: 'singles-swiss', format: 'singles', startMode: 'swiss', label: '🎾 Singles', sub: 'Swiss' },
  {
    id: 'singles-rr',
    format: 'singles',
    startMode: 'roundrobin',
    label: '🎾 Singles',
    sub: 'Round Robin',
  },
  {
    id: 'fixedpartner-swiss',
    format: 'fixedpartner',
    startMode: 'swiss',
    label: '👫 Doubles · Fixed Partners',
    sub: 'Swiss',
  },
  {
    id: 'fixedpartner-rr',
    format: 'fixedpartner',
    startMode: 'roundrobin',
    label: '👫 Doubles · Fixed Partners',
    sub: 'Round Robin',
  },
  {
    id: 'doublesrr',
    format: 'doublesrr',
    startMode: 'roundrobin',
    label: '🤝 Doubles · Rotating Partners',
    sub: 'Round Robin',
  },
  {
    id: 'trio',
    format: 'trio',
    startMode: 'roundrobin',
    label: '👥 Trio Teams',
    sub: 'Round Robin',
  },
];

// A freshly created tournament starts with no players/teams, default courts,
// and a default timer — all of which the admin sets up afterwards from
// ⚙️ Tournament Settings.
const DEFAULT_COURTS = ['1', '2', '3', '4'];
const DEFAULT_TIMER_SECS = 12 * 60;
const EMPTY_EVENT_DETAILS = { location: '', startTime: '', durationMins: 0, maxPlayers: 0 };

function FormatSelector({ value, onChange }: { value: string | null; onChange: (opt: (typeof FORMAT_OPTIONS)[number]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {FORMAT_OPTIONS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onChange(f)}
            type="button"
            className="rounded-xl px-4 py-3 flex flex-col items-start text-left gap-1"
            style={{
              background: active
                ? 'linear-gradient(135deg,#0f4c75,#1a6fa8)'
                : 'rgba(255,255,255,0.55)',
              color: active ? '#fff' : '#334155',
              border: '1px solid ' + (active ? 'transparent' : 'rgba(0,0,0,0.1)'),
              cursor: 'pointer',
              minHeight: 72,
            }}
          >
            <p className="font-bold text-base" style={{ margin: 0 }}>
              {f.label}
            </p>
            <span
              className="font-bold"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                background: active ? 'rgba(255,255,255,0.18)' : 'rgba(15,76,117,0.1)',
                color: active ? '#e0f2fe' : '#0f4c75',
              }}
            >
              {f.sub === 'Swiss' ? '🔄 Swiss' : '🔁 Round Robin'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface SetupProps { onStart: (...args: any[]) => void; onStartTPT: (...args: any[]) => void; onStartDoublesRR: (...args: any[]) => void }
export default function SetupScreen({ onStart, onStartTPT, onStartDoublesRR }: SetupProps) {
  const [format, setFormat] = useState('singles');
  const [startMode, setStartMode] = useState('swiss');

  const selectedFormatOptionId =
    FORMAT_OPTIONS.find((o) => o.format === format && o.startMode === startMode)?.id ?? null;

  const selectFormatOption = (opt: (typeof FORMAT_OPTIONS)[number]) => {
    setFormat(opt.format);
    setStartMode(opt.startMode);
  };

  const handleCreate = () => {
    if (format === 'trio') {
      onStartTPT({}, {}, DEFAULT_COURTS, DEFAULT_TIMER_SECS, 'Tournament', EMPTY_EVENT_DETAILS);
    } else if (format === 'doublesrr') {
      onStartDoublesRR({}, DEFAULT_COURTS, DEFAULT_TIMER_SECS, 'Tournament', EMPTY_EVENT_DETAILS);
    } else {
      onStart(
        [],
        [],
        DEFAULT_COURTS,
        DEFAULT_TIMER_SECS,
        'Tournament',
        0,
        EMPTY_EVENT_DETAILS,
        startMode
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-2xl p-6 flex flex-col gap-3"
        style={{
          background: 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div>
          <p className="text-sm font-bold text-slate-700 mb-1">Tournament Format</p>
          <p className="text-slate-500 text-xs">
            Pick how teams are formed and how rounds are scheduled. Teams/players, courts, location,
            and start time are all set up afterwards in ⚙️ Tournament Settings.
          </p>
        </div>
        <FormatSelector value={selectedFormatOptionId} onChange={selectFormatOption} />
      </div>

      <button
        onClick={handleCreate}
        className="w-full py-3 rounded-xl font-bold text-base btn-blue"
      >
        Create Tournament 🚀
      </button>
    </div>
  );
}
