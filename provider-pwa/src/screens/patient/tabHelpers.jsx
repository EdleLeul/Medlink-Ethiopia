// Shared helpers used by all patient tab files

export function row(label, value) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', marginBottom: 7, fontSize: 13 }}>
      <span style={{ color: '#6b6b6b', width: 150, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1a1a1a' }}>{value}</span>
    </div>
  )
}

export function Empty({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 20px', color: '#999', fontSize: 13 }}>
      {text}
    </div>
  )
}

export const card = {
  wrap:         { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  header:       { padding: '11px 16px', borderBottom: '0.5px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title:        { fontWeight: 500, fontSize: 13 },
  meta:         { fontSize: 11, color: '#6b6b6b' },
  body:         { padding: '14px 16px' },
  sectionLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#999', marginBottom: 10 },
}