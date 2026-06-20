import React, { useState } from 'react';
import ballIcon from '/ball.png';

interface Club {
  clubId: string;
  clubInfo: { name?: string; imageUrl?: string | null } | null;
}

interface Props {
  user: any;
  clubs: Club[];
  clubsLoading: boolean;
  onDone: (selectedClubIds: string[]) => Promise<void>;
}

export default function WelcomeScreen({ user, clubs, clubsLoading, onDone }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDone() {
    setSaving(true);
    await onDone([...selected]);
    setSaving(false);
  }

  const firstName = user?.displayName?.split(' ')[0] || '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'var(--surface)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', padding: '48px 0 64px' }}>

        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src={ballIcon}
            alt="Live Pickle"
            style={{
              width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)', marginBottom: 20,
            }}
          />
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px,5vw,32px)',
              fontWeight: 800,
              color: 'var(--court)',
              marginBottom: 8,
            }}
          >
            {firstName ? `Welcome, ${firstName}!` : 'Welcome to Live Pickle!'}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>
            Track live pickleball tournaments, follow clubs,<br />and run your own events.
          </p>
        </div>

        {/* Feature highlights */}
        <div
          style={{
            background: 'var(--court-faint)',
            border: '1px solid var(--court-soft)',
            borderRadius: 16,
            padding: '20px 22px',
            marginBottom: 28,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--court)', fontSize: 13, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            What you can do
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '🏆', text: 'Follow clubs and watch live tournament standings in real time' },
              { icon: '🤝', text: 'Join a club to register as a player for upcoming events' },
              { icon: '🎾', text: 'Create your own club, build your team, and host tournaments for your community' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Club selection */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 19,
              color: 'var(--ink)',
              marginBottom: 4,
            }}
          >
            Join clubs
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px', lineHeight: 1.5 }}>
            Select the clubs you play with. Their tournaments will appear on your home screen.
          </p>

          {clubsLoading ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>Loading clubs…</div>
          ) : clubs.length === 0 ? (
            <div
              style={{
                background: 'var(--white)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '20px 18px',
                color: 'var(--muted)',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              No clubs yet — you can create your own after getting started!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clubs.map(({ clubId, clubInfo }) => {
                const isSelected = selected.has(clubId);
                return (
                  <button
                    key={clubId}
                    onClick={() => toggle(clubId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: isSelected ? 'var(--court-faint)' : 'var(--white)',
                      border: `2px solid ${isSelected ? 'var(--court)' : 'var(--border)'}`,
                      transition: 'border-color 0.1s, background 0.1s',
                    }}
                  >
                    <img
                      src={clubInfo?.imageUrl || ballIcon}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontWeight: 600,
                        fontSize: 15,
                        color: isSelected ? 'var(--court)' : 'var(--ink)',
                      }}
                    >
                      {clubInfo?.name ?? clubId}
                    </span>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isSelected ? 'var(--court)' : 'transparent',
                        border: `2px solid ${isSelected ? 'var(--court)' : 'var(--border)'}`,
                        fontSize: 12,
                        color: '#fff',
                        fontWeight: 800,
                        transition: 'all 0.1s',
                      }}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleDone}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 16,
            cursor: saving ? 'default' : 'pointer',
            background: 'var(--court)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(27,122,120,0.3)',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : selected.size > 0 ? `Join ${selected.size} club${selected.size !== 1 ? 's' : ''} →` : 'Continue without joining →'}
        </button>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 10 }}>
          You can join more clubs or create your own from the home screen.
        </p>
      </div>
    </div>
  );
}
