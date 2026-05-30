import { Empty } from './tabHelpers.jsx'

export default function TimelineTab({ records }) {
  const events = []
  const push = (arr, type, getLabel) =>
    (arr || []).forEach(r => {
      if (r.createdAt) events.push({ date: r.createdAt, type, label: getLabel(r), facility: r.facilityName })
    })

  push(records.consultations,   'consultation', r => r.chiefComplaint || 'Consultation')
  push(records.diagnoses,       'diagnosis',    r => r.diagnosisName || r.icdCode || 'Diagnosis')
  push(records.medications,     'medication',   r => `${r.medicationName || '—'} ${r.dosage || ''}`.trim())
  push(records.labResults,      'lab',          r => `${r.testName}: ${r.result} ${r.unit || ''}`.trim())
  push(records.referrals,       'referral',     r => `Referred to ${r.referredTo || '—'}`)
  push(records.surgicalHistory, 'surgery',      r => r.procedure || 'Surgical procedure')
  push(records.vaccinations,    'vaccine',      r => r.vaccineName || 'Vaccination')

  events.sort((a, b) => {
    const ta = a.date?._seconds || new Date(a.date).getTime() / 1000
    const tb = b.date?._seconds || new Date(b.date).getTime() / 1000
    return tb - ta
  })

  const icons = {
    consultation: '🩺', diagnosis: '📋', medication: '💊',
    lab: '🧪', referral: '📨', surgery: '🏥', vaccine: '💉',
  }

  const fmt = ts => {
    if (!ts) return '—'
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)
    return d.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (!events.length) return <Empty text="No records to display on the timeline yet." />

  return (
    <div style={{ paddingTop: 16 }}>
      {events.map((e, i) => (
        <div key={i} style={s.row}>
          <div style={s.dotCol}>
            <div style={s.dot}>{icons[e.type] || '📌'}</div>
            {i < events.length - 1 && <div style={s.line} />}
          </div>
          <div style={s.body}>
            <div style={s.label}>{e.label}</div>
            <div style={s.meta}>{fmt(e.date)}{e.facility ? ` · ${e.facility}` : ''}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const s = {
  row:    { display: 'flex', gap: 12, marginBottom: 0 },
  dotCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: 32, flexShrink: 0 },
  dot:    { width: 32, height: 32, borderRadius: '50%', background: '#fff', border: '0.5px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1 },
  line:   { flex: 1, width: 1, background: '#e5e5e5', margin: '2px 0' },
  body:   { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '9px 14px', marginBottom: 8, flex: 1 },
  label:  { fontSize: 13, fontWeight: 500 },
  meta:   { fontSize: 11, color: '#6b6b6b', marginTop: 3 },
}