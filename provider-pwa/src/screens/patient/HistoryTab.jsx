import { row, card, Empty } from './tabHelpers.jsx'

export default function HistoryTab({ surgical = [], family = [], vaccinations = [] }) {
  const fmt = ts => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : ts || '—'

  return (
    <div style={{ paddingTop: 16 }}>

      <div style={card.sectionLabel}>Surgical history</div>
      {!surgical.length
        ? <Empty text="No surgical history recorded." />
        : surgical.map((r, i) => (
          <div key={i} style={card.wrap}>
            <div style={card.body}>
              {row('Procedure', r.procedure)}
              {row('ICD-10-PCS', r.icdPCSCode)}
              {row('Indication', r.indication)}
              {row('Date', fmt(r.date || r.createdAt))}
              {row('Anaesthesia', r.anaesthesia)}
              {row('Outcome', r.outcome)}
              {row('Surgeon', r.surgeon)}
              {row('Facility', r.facilityName)}
              {r.notes && row('Notes', r.notes)}
            </div>
          </div>
        ))
      }

      <div style={{ ...card.sectionLabel, marginTop: 16 }}>Family history</div>
      {!family.length
        ? <Empty text="No family history recorded." />
        : family.map((r, i) => (
          <div key={i} style={card.wrap}>
            <div style={card.body}>
              {row('Relation', r.relation)}
              {row('Condition', r.condition)}
              {r.ageOfOnset && row('Age of onset', r.ageOfOnset)}
              {row('Deceased', r.deceased)}
              {r.notes && row('Notes', r.notes)}
            </div>
          </div>
        ))
      }

      <div style={{ ...card.sectionLabel, marginTop: 16 }}>Vaccinations</div>
      {!vaccinations.length
        ? <Empty text="No vaccination records uploaded." />
        : vaccinations.map((r, i) => (
          <div key={i} style={card.wrap}>
            <div style={card.body}>
              {row('Vaccine', r.vaccineName)}
              {row('CVX / WHO code', r.vaccineCode)}
              {row('Dose', r.dose)}
              {row('Lot number', r.lotNumber)}
              {row('Date given', fmt(r.dateGiven || r.createdAt))}
              {row('Site', r.site)}
              {row('Administrator', r.administrator)}
              {row('Facility', r.facilityName)}
              {r.notes && row('Notes', r.notes)}
            </div>
          </div>
        ))
      }

    </div>
  )
}