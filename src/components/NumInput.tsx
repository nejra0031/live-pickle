export default function NumInput({ value, onChange }: { value: string | number; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value))))}
      style={{
        width: 'clamp(44px,11vw,64px)',
        textAlign: 'center',
        padding: 'clamp(5px,1.5vw,9px) 0',
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(0,0,0,0.15)',
        borderRadius: 8,
        color: '#1e293b',
        fontWeight: 800,
        fontSize: 'clamp(14px,3.5vw,20px)',
        outline: 'none',
      }}
    />
  );
}
