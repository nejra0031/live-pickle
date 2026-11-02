import { useRef, useState } from 'react';
import { imageBlobToLogoDataUrl, LOGO_MAX_BYTES, LOGO_MAX_DIM } from '../utils/logo';

// Club-logo picker: paste an image (Ctrl/Cmd+V while the box is focused) or pick
// a file. The image is downscaled and size-limited before being handed back as a
// data URL via onChange.
export default function ClubLogoInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function accept(blob: Blob | null | undefined) {
    if (!blob) return;
    setBusy(true);
    setError('');
    try {
      onChange(await imageBlobToLogoDataUrl(blob));
    } catch (e: any) {
      setError(e?.message || 'Could not use that image');
    } finally {
      setBusy(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) {
      setError('Clipboard has no image — copy an image first');
      return;
    }
    e.preventDefault();
    accept(item.getAsFile());
  }

  const btn: React.CSSProperties = {
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 8,
    fontWeight: 700,
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.04)',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <div
          tabIndex={0}
          role="button"
          aria-label="Club logo — paste an image here"
          data-testid="club-logo-dropzone"
          onPaste={handlePaste}
          onClick={(e) => (e.currentTarget as HTMLDivElement).focus()}
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: '1.5px dashed var(--court-soft)',
            background: 'var(--court-faint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: 'text',
            outlineOffset: 2,
          }}
        >
          {value ? (
            <img src={value} alt="Club logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 10, color: 'var(--court)', fontWeight: 700, textAlign: 'center', lineHeight: 1.2, whiteSpace: 'pre-line' }}>
              {busy ? '…' : 'Paste\nhere'}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" style={btn} onClick={() => fileRef.current?.click()}>
            Choose image…
          </button>
          {value && (
            <button type="button" style={btn} onClick={() => { onChange(''); setError(''); }}>
              Remove
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
        Click the circle and paste an image, or choose a file. Resized to {LOGO_MAX_DIM}px, max{' '}
        {Math.round(LOGO_MAX_BYTES / 1024)} KB.
      </span>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}
