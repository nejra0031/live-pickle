import { useState } from 'react';
import { ALL_TEAMS } from '../constants';

// A colored circle that opens a small palette picker when tapped, letting the
// user change a team/player's color (and matching text/foreground color).
export default function ColorSwatchPicker({ color, onChange, size = 12 }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Change colour"
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: color,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      />
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="rounded-2xl p-4 modal-box"
            style={{ width: 'auto', maxWidth: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-xs font-bold text-indigo-300 uppercase tracking-widest"
              style={{ marginBottom: 12 }}
            >
              Choose colour
            </p>
            <div className="flex flex-wrap" style={{ gap: 10 }}>
              {ALL_TEAMS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  onClick={() => {
                    onChange({ color: t.color, text: t.text });
                    setOpen(false);
                  }}
                  className="rounded-full"
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    cursor: 'pointer',
                    background: t.color,
                    border:
                      t.color === color ? '3px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
