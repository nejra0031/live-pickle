import { useState, useRef, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';

// Player name inputs with autocomplete from a cross-tournament known-players registry.
//
// Two modes depending on whether a `nickname` prop is supplied:
//
//   Basic (no nickname prop): Name + DUPR ID. Used where only DUPR data is needed.
//
//   Full (nickname prop provided): three fields shown in display-first order:
//     1. Nickname input  — the name shown in the game UI (placeholder "Name")
//     2. Full name text  — full legal name (read-only label, only shown when set via autocomplete)
//     3. DUPR ID input
//   Autocomplete searches all three fields; suggestions show the display name first.
//
// onChange always emits { name, duprId } and, when in full mode, also { nickname }.
//
// showFullName (default true, full mode only): when true the full legal name is
// shown as static read-only text below the nickname field; when false it is
// hidden entirely. Has no effect in basic mode.
export default function PlayerNameField({
  name, duprId, nickname, onChange,
  knownPlayers = [], placeholder = 'Name', inputStyle = {}, duprIdStyle = inputStyle,
  showFullName = true,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const showNickname = nickname !== undefined;

  const displayName = p => p.nickname || p.name;

  const search = useDebounce((q) => {
    const query = q.trim().toLowerCase();
    if (!query) { setSuggestions([]); return; }
    setSuggestions(
      knownPlayers.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.nickname && p.nickname.toLowerCase().includes(query)) ||
        (p.duprID && p.duprID.toLowerCase().includes(query))
      ).slice(0, 6)
    );
  }, 250);

  useEffect(() => {
    const onDocClick = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (p) => {
    onChange({ name: p.name, duprId: p.duprID || '', nickname: p.nickname || '' });
    setOpen(false);
    setSuggestions([]);
  };

  const emit = (fields) => onChange({ name, duprId, ...(showNickname ? { nickname } : {}), ...fields });

  const dropdown = open && suggestions.length > 0 && (
    <ul style={{
      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30, marginTop: 2,
      listStyle: 'none', padding: 4, borderRadius: 8, maxHeight: 160, overflowY: 'auto',
      background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    }}>
      {suggestions.map(p => (
        <li key={p.id} onMouseDown={() => pick(p)}
          style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#e2e8f0' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <span style={{ fontWeight: 700 }}>{displayName(p)}</span>
          {p.nickname && p.name && p.name !== p.nickname && <span style={{ color: '#64748b' }}> · {p.name}</span>}
          {p.duprID && <span style={{ color: '#94a3b8' }}> ({p.duprID})</span>}
        </li>
      ))}
    </ul>
  );

  if (showNickname) {
    return (
      <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
        {/* Primary: display name (nickname) */}
        <input
          value={nickname}
          placeholder="Name"
          onChange={e => { emit({ nickname: e.target.value }); search(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={inputStyle}
        />
        {dropdown}
        {showFullName && name && (
          <p style={{ margin: 0, padding: '1px 2px', fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>{name}</p>
        )}
        <input
          value={duprId}
          placeholder="DUPR ID"
          onChange={e => emit({ duprId: e.target.value })}
          style={duprIdStyle}
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      <input
        value={name}
        placeholder={placeholder}
        onChange={e => { emit({ name: e.target.value }); search(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
      />
      {dropdown}
      <input
        value={duprId}
        placeholder="DUPR ID"
        onChange={e => emit({ duprId: e.target.value })}
        style={duprIdStyle}
      />
    </div>
  );
}
