import { row, card, Empty } from './tabHelpers.jsx'

export default function ConsultationsTab({ records }) {
  if (!records.length) return <Empty text="No consultation records uploaded for this patient." />
  const fmt = ts => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : ts || '—'
  return (
    <div style={{ paddingTop: 16 }}>
      {records.map((r, i) => (
        <div key={i} style={card.wrap}>
          <div style={card.header}>
            <span style={card.title}>{r.chiefComplaint || 'Consultation'}</span>
            <span style={card.meta}>{fmt(r.createdAt)} · {r.facilityName || '—'}</span>
          </div>
          <div style={card.body}>
            {row('Chief complaint', r.chiefComplaint)}
            {row('Duration', r.duration)}
            {row('Examination', r.examinationFindings)}
            {row('Assessment', r.assessment)}
            {row('Plan', r.plan)}
            {row('Follow-up', fmt(r.followUpDate))}
            {r.doctorNotes && row('Notes', r.doctorNotes)}
          </div>
        </div>
      ))}
    </div>
  )
}