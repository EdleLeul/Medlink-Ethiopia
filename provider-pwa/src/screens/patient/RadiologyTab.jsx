import { row, card, Empty } from './tabHelpers.jsx'

export default function RadiologyTab({ records = [] }) {
  if (!records || !records.length) return <Empty text="No radiology records uploaded for this patient." />

  const fmt = ts => ts?._seconds ? new Date(ts._seconds * 1000).toLocaleDateString('en-ET', { dateStyle: 'medium' }) : ts || '—'

  return (
    <div style={{ paddingTop: 16 }}>
      {records.map((r, i) => (
        <div key={i} style={card.wrap}>
          <div style={card.header}>
            <span style={card.title}>{r.modality || 'Imaging'}{r.bodyPart ? ` — ${r.bodyPart}` : ''}</span>
            <span style={card.meta}>{fmt(r.studyDate || r.createdAt)} · {r.facilityName || '—'}</span>
          </div>
          <div style={card.body}>
            {r.fileURL && (
              <div style={{ marginBottom: 12 }}>
                {/\.(jpg|jpeg|png|gif)$/i.test(r.fileURL) && (
                  <img src={r.fileURL} alt="Radiology" style={{ maxWidth: '100%', borderRadius: 6, border: '0.5px solid #e5e5e5' }} />
                )}
                {/\.pdf$/i.test(r.fileURL) && (
                  <a href={r.fileURL} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#185FA5' }}>
                    📄 Open PDF report
                  </a>
                )}
                {/\.dcm$/i.test(r.fileURL) && (
                  <div style={{ background: '#f1efe8', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#6b6b6b' }}>
                    DICOM file attached.{' '}
                    <a href={r.fileURL} target="_blank" rel="noreferrer" style={{ color: '#185FA5' }}>Download</a>
                  </div>
                )}
              </div>
            )}
            {row('Indication', r.indication)}
            {row('Findings', r.findings)}
            {row('Impression', r.impression)}
            {row('Radiologist', r.radiologist)}
            {row('Accession no.', r.accessionNumber)}
          </div>
        </div>
      ))}
    </div>
  )
}