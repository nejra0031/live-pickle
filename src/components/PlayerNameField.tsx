import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import useDebounce from '../hooks/useDebounce';

const fieldLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 2px',
};

// Player name inputs with autocomplete from a cross-tournament known-players registry.
//
// Two modes depending on whether a `nickname` prop is supplied:
//
//   Basic (no nickname prop): Name + DUPR ID. Used where only DUPR data is needed.
//
//   Full (nickname prop provided): three fields shown in display-first order:
//     1. Nickname input  — the name shown in the game UI (placeholder "Name")
//     2. Full name input — full legal name, editable
//     3. DUPR ID input
//
// The "Name"/nickname input only suggests matches against known players' name/nickname;
// the DUPR ID input only suggests matches against known players' DUPR ID. Picking a
// suggestion from either field fills in all known fields for that player.
//
// `excludeKeys` (optional Set of `name.trim().toLowerCase()` strings)
// hides players already present elsewhere in the current roster from suggestions.
//
// onChange always emits { name, duprId } and, when in full mode, also { nickname }.
//
// showFullName (default true, full mode only): when true the full-name input is
// shown below the nickname field; when false it is hidden entirely. Has no
// effect in basic mode.
export default function PlayerNameField({
  name,
  duprId,
  nickname,
  onChange,
  knownPlayers = [],
  excludeKeys,
  placeholder = 'Name',
  inputStyle = {},
  duprIdStyle = inputStyle,
  showFullName = true,
}: {
  name: any;
  duprId: any;
  nickname?: any;
  onChange: any;
  knownPlayers?: any[];
  excludeKeys?: any;
  placeholder?: string;
  inputStyle?: CSSProperties;
  duprIdStyle?: any;
  showFullName?: boolean;
}) {
  const [nameSuggestions, setNameSuggestions] = useState<any[]>([]);
  const [nameOpen, setNameOpen] = useState(false);
  const [duprSuggestions, setDuprSuggestions] = useState<any[]>([]);
  const [duprOpen, setDuprOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const showNickname = nickname !== undefined;

  const isExcluded = (p: any) => excludeKeys?.has((p.name || '').trim().toLowerCase());

  const searchName = useDebounce((q: string) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      setNameSuggestions([]);
      return;
    }
    setNameSuggestions(
      knownPlayers
        .filter(
          (p) =>
            !isExcluded(p) &&
            (p.name.toLowerCase().includes(query) ||
              (p.nickname && p.nickname.toLowerCase().includes(query)))
        )
        .slice(0, 6)
    );
  }, 250);

  const searchDupr = useDebounce((q: string) => {
    const query = q.trim().toLowerCase();
    if (!query) {
      setDuprSuggestions([]);
      return;
    }
    setDuprSuggestions(
      knownPlayers
        .filter((p) => !isExcluded(p) && p.duprID && p.duprID.toLowerCase().includes(query))
        .slice(0, 6)
    );
  }, 250);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node | null)) {
        setNameOpen(false);
        setDuprOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (p: any) => {
    // Fall back to the full name when the known player has no nickname, so the
    // primary "Name" field doesn't end up showing blank after picking.
    onChange({ name: p.name, duprId: p.duprID || '', nickname: p.nickname || p.name || '' });
    setNameOpen(false);
    setNameSuggestions([]);
    setDuprOpen(false);
    setDuprSuggestions([]);
  };

  const emit = (fields: Record<string, any>) =>
    onChange({ name, duprId, ...(showNickname ? { nickname } : {}), ...fields });

  const renderDropdown = (open: boolean, suggestions: any[]) =>
    open &&
    suggestions.length > 0 && (
      <ul
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 30,
          marginTop: 2,
          listStyle: 'none',
          padding: 4,
          borderRadius: 8,
          maxHeight: 160,
          overflowY: 'auto',
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        {suggestions.map((p) => (
          <li
            key={p.id}
            onMouseDown={() => pick(p)}
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
              color: '#e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span
              style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', flexShrink: 0 }}
            >
              {(p.id || '').slice(-4)}
            </span>
            <span style={{ color: '#64748b' }}>·</span>
            <span style={{ fontWeight: 700 }}>{p.name}</span>
            {p.nickname && (
              <>
                <span style={{ color: '#475569' }}>·</span>
                <span style={{ color: '#94a3b8' }}>{p.nickname}</span>
              </>
            )}
          </li>
        ))}
      </ul>
    );

  if (showNickname) {
    return (
      <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* Primary: display name (nickname) */}
        <div>
          <p style={fieldLabelStyle}>Nickname</p>
          <div style={{ position: 'relative' }}>
            <input
              value={nickname}
              placeholder="Name"
              onChange={(e) => {
                emit({ nickname: e.target.value });
                searchName(e.target.value);
                setNameOpen(true);
              }}
              onFocus={() => setNameOpen(true)}
              style={inputStyle}
            />
            {renderDropdown(nameOpen, nameSuggestions)}
          </div>
        </div>
        {showFullName && (
          <div>
            <p style={fieldLabelStyle}>Full name (DUPR)</p>
            <input
              value={name}
              placeholder="Full name"
              onChange={(e) => emit({ name: e.target.value })}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
        )}
        <div>
          <p style={fieldLabelStyle}>DUPR ID</p>
          <div style={{ position: 'relative' }}>
            <input
              value={duprId}
              placeholder="DUPR ID"
              onChange={(e) => {
                emit({ duprId: e.target.value });
                searchDupr(e.target.value);
                setDuprOpen(true);
              }}
              onFocus={() => setDuprOpen(true)}
              style={duprIdStyle}
            />
            {renderDropdown(duprOpen, duprSuggestions)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={name}
          placeholder={placeholder}
          onChange={(e) => {
            emit({ name: e.target.value });
            searchName(e.target.value);
            setNameOpen(true);
          }}
          onFocus={() => setNameOpen(true)}
          style={inputStyle}
        />
        {renderDropdown(nameOpen, nameSuggestions)}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={duprId}
          placeholder="DUPR ID"
          onChange={(e) => {
            emit({ duprId: e.target.value });
            searchDupr(e.target.value);
            setDuprOpen(true);
          }}
          onFocus={() => setDuprOpen(true)}
          style={duprIdStyle}
        />
        {renderDropdown(duprOpen, duprSuggestions)}
      </div>
    </div>
  );
}
