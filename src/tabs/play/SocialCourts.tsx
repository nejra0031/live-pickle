export default function SocialCourts({ socialCourts }: { socialCourts: string[] }) {
  if (!socialCourts || socialCourts.length === 0) return null;
  return (
    <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
      <div
        style={{
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: 'clamp(9px,2vw,11px)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        — social play —
      </div>
      {socialCourts.map((c) => (
        <div
          key={c}
          className="rounded-2xl flex flex-col items-center"
          style={{
            padding: 'clamp(14px,3.5vw,22px)',
            background: 'var(--court-faint)',
            borderTop: '1px solid var(--court-soft)',
            borderRight: '1px solid var(--court-soft)',
            borderBottom: '1px solid var(--court-soft)',
            borderLeft: '3px solid var(--court)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(10px,2.5vw,13px)',
              color: 'var(--court)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            Court {c}
          </p>
          <p
            className="font-black"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(16px,4.5vw,28px)',
              color: 'var(--court)',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            WARM UP / SOCIAL
          </p>
          <p style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: 'var(--muted)', marginTop: 4 }}>
            Open play — not counted in standings
          </p>
        </div>
      ))}
    </div>
  );
}
