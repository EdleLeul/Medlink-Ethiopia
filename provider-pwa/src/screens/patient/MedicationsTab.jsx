import { row, card, Empty } from './tabHelpers.jsx'

export default function MedicationsTab({ records }) {
  if (!records.length) return <Empty text="No medication records uploaded for this patient." />

  const fmt = ts => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : ts || '—'
  const active = records.filter(r => r.status === 'Active' || r.status === 'active' || !r.status)
  const past   = records.filter(r => ['Stopped','stopped','Completed','completed','On hold'].includes(r.status))

  const MedCard = ({ r, faded }) => (
    <div style={{ ...card.wrap, opacity: faded ? 0.65 : 1 }}>
      <div style={card.body}>
        {row('Medication', r.medicationName)}
        {row('Dosage', r.dosage)}
        {row('Frequency', r.frequency)}
        {row('Route', r.route)}
        {row('Indication', r.indication)}
        {row('Started', fmt(r.startDate || r.createdAt))}
        {faded && row('Stopped', fmt(r.endDate || r.createdAt))}
        {row('Prescribed at', r.facilityName)}
        {r.notes && row('Notes', r.notes)}
      </div>
    </div>
  )

  return (
    <div style={{ paddingTop: 16 }}>
      {active.length > 0 && (
        <>
          <div style={card.sectionLabel}>Current medications</div>
          {active.map((r, i) => <MedCard key={i} r={r} faded={false} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <div style={{ ...card.sectionLabel, marginTop: 16 }}>Past medications</div>
          {past.map((r, i) => <MedCard key={i} r={r} faded={true} />)}
        </>
      )}
    </div>
  )
}