import { row, card, Empty } from './tabHelpers.jsx'

export default function LabsTab({ records }) {
  if (!records.length) return <Empty text="No laboratory results uploaded for this patient." />

  const fmt = ts => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : ts || '—'

  return (
    <div style={{ paddingTop: 16 }}>
      {records.map((r, i) => {
        const isAbnormal = ['High','Low','Abnormal','Critical high','Critical low'].includes(r.flag)
        return (
          <div key={i} style={card.wrap}>
            <div style={card.header}>
              <span style={card.title}>{r.testName || '—'}</span>
              <span style={card.meta}>{fmt(r.createdAt)} · {r.facilityName || '—'}</span>
            </div>
            <div style={card.body}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: isAbnormal ? '#a32d2d' : '#0F6E56' }}>
                  {r.result} {r.unit || ''}
                </span>
                {isAbnormal && (
                  <span style={{ fontSize: 11, background: '#fcebeb', color: '#a32d2d', padding: '2px 8px', borderRadius: 20 }}>
                    {r.flag?.toUpperCase()}
                  </span>
                )}
              </div>
              {r.loincCode && row('LOINC', r.loincCode)}
              {r.cielID && row('CIeL ID', r.cielID)}
              {row('Reference range', r.referenceRange)}
              {row('Specimen', r.specimenType)}
              {row('Collected', fmt(r.collectionDate))}
              {row('Comments', r.comments)}
            </div>
          </div>
        )
      })}
    </div>
  )
}