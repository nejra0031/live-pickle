import { useState, useRef, useEffect } from 'react';
import useDebounce from '../hooks/useDebounce';

// Paired "Name" + "DUPR ID" inputs with name-based autocomplete sourced from
// a cross-tournament known-players registry. Selecting a suggestion fills both.
export default function PlayerNameField({
  name, duprId, onChange, knownPlayers = [], placeholder = 'Name', inputStyle = {}, duprIdStyle = inputStyle,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const search = useDebounce((q) => {
    const query = q.trim().toLowerCase();
    if (!query) { setSuggestions([]); return; }
    setSuggestions(knownPlayers.filter(p => p.name.toLowerCase().includes(query)).slice(0, 6));
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

  return (
    <div ref={wrapRef} style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
      <input
        value={name}
        placeholder={placeholder}
        onChange={e => { onChange({ name: e.target.value, duprId }); search(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
      />
      {open && suggestions.length > 0 && (
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
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              {p.duprID && <span style={{ color: '#94a3b8' }}> ({p.duprID})</span>}
              {p.nickname && <span style={{ color: '#94a3b8' }}> - {p.nickname}</span>}
            </li>
          ))}
        </ul>
      )}
      <input
        value={duprId}
        placeholder="DUPR ID"
        onChange={e => onChange({ name, duprId: e.target.value })}
        style={duprIdStyle}
      />
    </div>
  );
}
