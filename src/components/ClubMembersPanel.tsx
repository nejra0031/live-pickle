import React, { useState } from 'react';
import { useClubMembers } from '../hooks/useClubMembers';
import { migrateKnownPlayersToClub } from '../firebase';

type SortCol = 'nickname' | 'name' | 'dupr' | 'email';

const COLS: { key: SortCol; label: string; flex: number }[] = [
  { key: 'nickname', label: 'Nickname', flex: 2 },
  { key: 'name',     label: 'Full name', flex: 2 },
  { key: 'dupr',     label: 'DUPR ID',  flex: 1.5 },
  { key: 'email',    label: 'Email',    flex: 2.5 },
];

const iS: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 8,
  fontSize: 13,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#e2e8f0',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

function colVal(m: any, col: SortCol): string {
  if (col === 'nickname') return m.nickname || m.name || '';
  if (col === 'name')     return m.name || '';
  if (col === 'dupr')     return m.duprID || m.duprId || '';
  if (col === 'email')    return m.email || '';
  return '';
}

export default function ClubMembersPanel({ clubId, onClose }: { clubId: string; onClose: () => void }) {
  const { members, loading, error, addMember, updateMember, removeMember, refresh } = useClubMembers(clubId);

  // Add form
  const [nickname, setNickname]   = useState('');
  const [fullName, setFullName]   = useState('');
  const [duprId, setDuprId]       = useState('');
  const [email, setEmail]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');

  // Search & sort
  const [search, setSearch]     = useState('');
  const [sortCol, setSortCol]   = useState<SortCol>('nickname');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  // Expanded row
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editDuprId, setEditDuprId]     = useState('');
  const [editEmail, setEditEmail]       = useState('');
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState('');

  // Migration
  const [importing, setImporting]     = useState(false);
  const [importMsg, setImportMsg]     = useState('');

  async function handleImport() {
    setImporting(true);
    setImportMsg('');
    try {
      const count = await migrateKnownPlayersToClub(clubId);
      await refresh();
      setImportMsg(`Imported ${count} player${count !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error('migrateKnownPlayersToClub failed', err);
      setImportMsg('Import failed.');
    } finally {
      setImporting(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    setSaveError('');
    try {
      await addMember(nickname.trim(), fullName.trim(), duprId.trim(), email.trim());
      setNickname(''); setFullName(''); setDuprId(''); setEmail('');
    } catch {
      setSaveError('Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  }

  function handleRowClick(m: any) {
    if (expandedId === m.id) {
      setExpandedId(null);
    } else {
      setExpandedId(m.id);
      setEditNickname(m.nickname || m.name || '');
      setEditFullName(m.name || '');
      setEditDuprId(m.duprID || m.duprId || '');
      setEditEmail(m.email || '');
      setEditError('');
    }
  }

  async function handleSave() {
    if (!editNickname.trim() || !expandedId) return;
    setEditSaving(true);
    setEditError('');
    try {
      await updateMember(expandedId, editNickname, editFullName, editDuprId, editEmail);
      setExpandedId(null);
    } catch {
      setEditError('Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeMember(id);
      setExpandedId(null);
    } catch {
      setEditError('Failed to remove');
    }
  }

  const q = search.trim().toLowerCase();
  const filtered = q
    ? members.filter(
        (m) =>
          (m.nickname || '').toLowerCase().includes(q) ||
          (m.name || '').toLowerCase().includes(q) ||
          (m.duprID || m.duprId || '').toLowerCase().includes(q) ||
          (m.id || '').toLowerCase().includes(q) ||
          (m.email || '').toLowerCase().includes(q)
      )
    : members;

  const sorted = [...filtered].sort((a, b) => {
    const cmp = colVal(a, sortCol).localeCompare(colVal(b, sortCol));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          borderRadius: 20,
          width: '100%',
          maxWidth: 560,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#e2e8f0' }}>Club Members</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Add member form */}
          <form onSubmit={handleAdd} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Add Member
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input style={iS} placeholder="Nickname *" value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <input style={iS} placeholder="Full name (as on DUPR)" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <input style={iS} placeholder="DUPR ID (optional)" value={duprId} onChange={(e) => setDuprId(e.target.value)} />
              <input style={iS} placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {saveError && <p style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>{saveError}</p>}
            <button
              type="submit"
              disabled={saving || !nickname.trim()}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '8px 0',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                cursor: nickname.trim() ? 'pointer' : 'default',
                background: nickname.trim() ? 'var(--court, #0ea5e9)' : 'rgba(255,255,255,0.06)',
                color: nickname.trim() ? '#fff' : '#475569',
                border: 'none',
              }}
            >
              {saving ? 'Adding…' : 'Add Member'}
            </button>
          </form>

          {/* Import from global players */}
          <div style={{ marginBottom: 8 }}>
            <button
              onClick={handleImport}
              disabled={importing}
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 12,
                cursor: importing ? 'default' : 'pointer',
                background: 'rgba(255,255,255,0.05)',
                color: '#64748b',
                border: '1px dashed rgba(255,255,255,0.12)',
              }}
            >
              {importing ? 'Importing…' : 'Import all from global players list'}
            </button>
            {importMsg && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0', textAlign: 'center' }}>
                {importMsg}
              </p>
            )}
          </div>

          {/* Divider + Member list title */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0 16px' }} />
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Member list
          </p>

          {/* Search */}
          <input
            style={{ ...iS, marginBottom: 10, background: 'rgba(255,255,255,0.05)' }}
            placeholder="Search by nickname, name, DUPR ID, ID, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Column headers */}
          <div style={{ display: 'flex', gap: 0, padding: '0 8px', marginBottom: 4 }}>
            {COLS.map((col) => (
              <button
                key={col.key}
                onClick={() => handleSort(col.key)}
                style={{
                  flex: col.flex,
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: sortCol === col.key ? '#cbd5e1' : '#475569',
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  minWidth: 0,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.label}</span>
                {sortCol === col.key && <span style={{ fontSize: 10, flexShrink: 0 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 2 }} />

          {/* States */}
          {loading && <p style={{ color: '#64748b', fontSize: 13, padding: '8px 0' }}>Loading…</p>}
          {error && <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>}
          {!loading && !error && members.length === 0 && (
            <p style={{ color: '#475569', fontSize: 13, padding: '8px 0' }}>No members yet.</p>
          )}
          {!loading && !error && members.length > 0 && filtered.length === 0 && (
            <p style={{ color: '#475569', fontSize: 13, padding: '8px 0' }}>No members match your search.</p>
          )}

          {/* Rows */}
          {sorted.map((m) => {
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {/* Compact row */}
                <div
                  onClick={() => handleRowClick(m)}
                  style={{
                    display: 'flex',
                    gap: 0,
                    padding: '8px 8px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: isExpanded ? 'rgba(255,255,255,0.04)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {COLS.map((col) => {
                    const val = colVal(m, col.key) || '—';
                    return (
                      <span
                        key={col.key}
                        title={val !== '—' ? val : undefined}
                        style={{
                          flex: col.flex,
                          fontSize: 13,
                          color: val === '—' ? '#334155' : col.key === 'nickname' ? '#e2e8f0' : '#94a3b8',
                          fontWeight: col.key === 'nickname' ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                        }}
                      >
                        {val}
                      </span>
                    );
                  })}
                </div>

                {/* Expanded edit form */}
                {isExpanded && (
                  <div style={{ padding: '10px 8px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <input style={iS} placeholder="Nickname *" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} />
                    <input style={iS} placeholder="Full name (as on DUPR)" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                    <input style={iS} placeholder="DUPR ID" value={editDuprId} onChange={(e) => setEditDuprId(e.target.value)} />
                    <input style={iS} placeholder="Email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                    {editError && <p style={{ color: '#fca5a5', fontSize: 12, margin: 0 }}>{editError}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <button
                        onClick={() => handleRemove(m.id)}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                          background: 'rgba(239,68,68,0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}
                      >
                        Remove from club
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={editSaving || !editNickname.trim()}
                        style={{
                          flex: 1,
                          padding: '7px 0',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: editNickname.trim() ? 'pointer' : 'default',
                          background: editNickname.trim() ? 'var(--court, #0ea5e9)' : 'rgba(255,255,255,0.06)',
                          color: editNickname.trim() ? '#fff' : '#475569',
                          border: 'none',
                        }}
                      >
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && sorted.length > 0 && (
            <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 10 }}>
              {filtered.length} member{filtered.length !== 1 ? 's' : ''}{q ? ` of ${members.length}` : ''}
            </p>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.08)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
