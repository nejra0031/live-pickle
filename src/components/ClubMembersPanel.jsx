import { useState } from 'react';
import { useClubMembers } from '../hooks/useClubMembers';

const iS = { padding: '8px 10px', borderRadius: 8, fontSize: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', outline: 'none', width: '100%' };

export default function ClubMembersPanel({ clubId, onClose }) {
  const { members, loading, error, addMember } = useClubMembers(clubId);
  const [name, setName]         = useState('');
  const [duprId, setDuprId]     = useState('');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setSaveError('');
    try {
      await addMember(name.trim(), duprId.trim(), nickname.trim());
      setName(''); setDuprId(''); setNickname('');
    } catch (err) {
      setSaveError('Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#1e293b', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#e2e8f0' }}>Club Members</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Add member form */}
          <form onSubmit={handleAdd} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Add Member</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={iS} placeholder="Name *" value={name} onChange={e => setName(e.target.value)} />
              <input style={iS} placeholder="DUPR ID (optional)" value={duprId} onChange={e => setDuprId(e.target.value)} />
              <input style={iS} placeholder="Nickname (optional)" value={nickname} onChange={e => setNickname(e.target.value)} />
            </div>
            {saveError && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{saveError}</p>}
            <button type="submit" disabled={saving || !name.trim()} style={{ marginTop: 10, width: '100%', padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: name.trim() ? 'pointer' : 'default', background: name.trim() ? 'linear-gradient(90deg,#0f4c75,#1a6fa8)' : 'rgba(255,255,255,0.06)', color: name.trim() ? '#fff' : '#475569', border: 'none' }}>
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </form>

          {/* Member list */}
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Members ({members.length})
          </p>
          {loading && <p style={{ color: '#64748b', fontSize: 13 }}>Loading…</p>}
          {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
          {!loading && !error && members.length === 0 && (
            <p style={{ color: '#475569', fontSize: 13 }}>No members yet.</p>
          )}
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{m.name}</span>
                {m.nickname && <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>&quot;{m.nickname}&quot;</span>}
              </div>
              {m.duprId && <span style={{ fontSize: 12, color: '#94a3b8' }}>DUPR {m.duprId}</span>}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
