import { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import Layout from '../../components/Layout'
import RecordEntryForm from '../../components/RecordEntryForm'
import { uploadRecord } from '../../services/api'
import { parseHL7, isHL7File } from '../../services/hl7Parser'
import { RECORD_TYPE_LABELS, CSV_COLUMN_HINTS, CIEL_LAB_CONCEPTS, RECORD_FIELDS } from '../../config/clinicalConstants'
import useAuthStore from '../../store/authStore'

// ─── Modes ───────────────────────────────────────────────────────────────────
// 'choose'   — pick entry mode (manual or file)
// 'manual'   — fill RecordEntryForm by hand
// 'mapping'  — review CSV/XLSX column mapping
// 'review'   — review parsed rows one by one before upload (edit each)
// 'done'     — upload results
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadScreen() {
  const { activePatient } = useAuthStore()
  const fileInputRef = useRef(null)

  const [mode, setMode] = useState('choose')
  const [patientID, setPatientID] = useState(activePatient?.patientID || '')
  const [recordType, setRecordType] = useState('vitals')
  const [fileError, setFileError] = useState('')

  // CSV / HL7 state
  const [headers, setHeaders] = useState([])
  const [parsedRows, setParsedRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [hl7Multi, setHl7Multi] = useState(null) // { labResults: [], medications: [], ... }

  // Review state
  const [reviewRows, setReviewRows] = useState([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [editedRows, setEditedRows] = useState([])

  // Upload results
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)

  // ─── File handling ──────────────────────────────────────────────────────────
  const handleFile = async (file) => {
    setFileError('')
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()

    if (ext === 'hl7' || ext === 'txt') {
      const text = await file.text()
      if (!isHL7File(text)) { setFileError('File does not appear to be a valid HL7 v2 message (must start with MSH|).'); return }
      const parsed = parseHL7(text)
      if (!Object.keys(parsed).length) { setFileError('No recognisable HL7 segments found in this file.'); return }
      setHl7Multi(parsed)
      // Go straight to review — HL7 maps to multiple record types
      const firstType = Object.keys(parsed)[0]
      setRecordType(firstType)
      beginReview(parsed[firstType], firstType)
      return
    }

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          if (!res.data.length) { setFileError('File is empty.'); return }
          setHeaders(Object.keys(res.data[0]))
          setParsedRows(res.data)
          autoMap(Object.keys(res.data[0]))
          setMode('mapping')
        },
        error: () => setFileError('Could not parse CSV.'),
      })
      return
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (!data.length) { setFileError('Sheet is empty.'); return }
      setHeaders(Object.keys(data[0]))
      setParsedRows(data)
      autoMap(Object.keys(data[0]))
      setMode('mapping')
      return
    }

    setFileError('Unsupported format. Use CSV, Excel (.xlsx / .xls), or HL7 v2 (.hl7 / .txt).')
  }

  const autoMap = (hdrs) => {
    const map = {}
    hdrs.forEach(h => {
      const norm = h.toLowerCase().replace(/[\s_\-\.]/g, '')
      if (CSV_COLUMN_HINTS[norm]) map[h] = CSV_COLUMN_HINTS[norm]
    })
    setMapping(map)
  }

  // ─── From mapping → review ──────────────────────────────────────────────────
  const applyMappingAndReview = () => {
    const rows = parsedRows.map(row => {
      const record = {}
      headers.forEach(h => { if (mapping[h]) record[mapping[h]] = String(row[h] || '') })
      return record
    }).filter(r => Object.values(r).some(v => v.trim()))
    beginReview(rows, recordType)
  }

  const beginReview = (rows, type) => {
    setReviewRows(rows)
    setEditedRows(rows.map(r => ({ ...r })))
    setReviewIndex(0)
    setRecordType(type)
    setMode('review')
  }

  // ─── Upload all reviewed rows ───────────────────────────────────────────────
  const handleUpload = async (rows = editedRows, type = recordType) => {
    if (!patientID.trim()) { setFileError('Patient ID is required.'); return }
    setUploading(true)
    let success = 0, failed = 0
    for (const row of rows) {
      try {
        await uploadRecord(patientID.trim(), type, row)
        success++
      } catch { failed++ }
    }

    // If HL7 multi-type, continue with remaining types
    if (hl7Multi) {
      const types = Object.keys(hl7Multi)
      const currentIdx = types.indexOf(type)
      if (currentIdx < types.length - 1) {
        const nextType = types[currentIdx + 1]
        setUploading(false)
        beginReview(hl7Multi[nextType], nextType)
        return
      }
    }

    setUploading(false)
    setResults({ success, failed, type })
    setMode('done')
  }

  // ─── Manual single record submit ────────────────────────────────────────────
  const handleManualSubmit = async (values) => {
    if (!patientID.trim()) { setFileError('Patient ID is required.'); return }
    setUploading(true)
    try {
      await uploadRecord(patientID.trim(), recordType, values)
      setResults({ success: 1, failed: 0, type: recordType })
      setMode('done')
    } catch {
      setFileError('Upload failed. Check your connection and try again.')
      setUploading(false)
    }
  }

  const reset = () => {
    setMode('choose'); setParsedRows([]); setHeaders([]); setMapping({})
    setReviewRows([]); setEditedRows([]); setReviewIndex(0)
    setResults(null); setFileError(''); setHl7Multi(null)
    setPatientID(activePatient?.patientID || '')
    setRecordType('vitals')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Patient ID + record type selector (shown in choose, manual, mapping)
  // ─────────────────────────────────────────────────────────────────────────────
  const PatientRecordSelector = () => (
    <div style={s.selectorCard}>
      <div style={s.selectorRow}>
        <div style={s.fieldGroup}>
          <label style={s.label}>Patient MedLink ID <span style={{ color: '#a32d2d' }}>*</span></label>
          <input
            value={patientID}
            onChange={e => setPatientID(e.target.value)}
            placeholder="ML-YYYYMMDD-XXXXXX"
            style={{ fontFamily: 'monospace' }}
          />
        </div>
        <div style={s.fieldGroup}>
          <label style={s.label}>Record type</label>
          <select value={recordType} onChange={e => setRecordType(e.target.value)}>
            {Object.entries(RECORD_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Upload records">

      {/* ── MODE: choose ── */}
      {mode === 'choose' && (
        <>
          <h2 style={s.h2}>Add patient records</h2>
          <p style={s.sub}>Enter records manually or import from your hospital EMR export.</p>
          <PatientRecordSelector />
          {fileError && <div style={s.errorBox}>{fileError}</div>}
          <div style={s.modeGrid}>
            <div style={s.modeCard} onClick={() => setMode('manual')}>
              <div style={s.modeIcon}>✏️</div>
              <div style={s.modeTitle}>Manual entry</div>
              <div style={s.modeSub}>Fill in fields by hand. Structured forms with clinical ranges and validation.</div>
            </div>
            <div style={s.modeCard} onClick={() => fileInputRef.current?.click()}>
              <div style={s.modeIcon}>📂</div>
              <div style={s.modeTitle}>Import file</div>
              <div style={s.modeSub}>CSV, Excel (.xlsx), or HL7 v2 (.hl7). Review and edit before uploading.</div>
            </div>
          </div>
          <input
            ref={fileInputRef} type="file"
            accept=".csv,.xlsx,.xls,.hl7,.txt"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <div style={s.formatNote}>
            Accepted formats: CSV · Excel (.xlsx / .xls) · HL7 v2 (.hl7 / .txt)
            <br />FHIR R4 · HL7 v2 · CIeL/LOINC aligned
          </div>
        </>
      )}

      {/* ── MODE: manual ── */}
      {mode === 'manual' && (
        <>
          <div style={s.stepHeader}>
            <div>
              <h2 style={s.h2}>Manual entry — {RECORD_TYPE_LABELS[recordType]}</h2>
              <p style={s.sub}>All constrained fields show valid ranges. Required fields marked *</p>
            </div>
            <button style={s.backBtn} onClick={() => { setMode('choose'); setFileError('') }}>← Back</button>
          </div>
          <PatientRecordSelector />
          {fileError && <div style={s.errorBox}>{fileError}</div>}
          <div style={s.formCard}>
            <RecordEntryForm
              recordType={recordType}
              initial={{}}
              onSubmit={handleManualSubmit}
              submitLabel={uploading ? 'Saving…' : 'Save record'}
              disabled={uploading}
            />
          </div>
        </>
      )}

      {/* ── MODE: mapping ── */}
      {mode === 'mapping' && (
        <>
          <div style={s.stepHeader}>
            <div>
              <h2 style={s.h2}>Map columns</h2>
              <p style={s.sub}>{parsedRows.length} rows detected. Columns auto-matched where possible — adjust as needed.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.backBtn} onClick={reset}>← Back</button>
              <button style={s.primaryBtn} onClick={applyMappingAndReview}>
                Review {parsedRows.length} records →
              </button>
            </div>
          </div>
          <PatientRecordSelector />
          {fileError && <div style={s.errorBox}>{fileError}</div>}
          <div style={s.formCard}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>CSV column</th>
                  <th style={s.th}>Sample value</th>
                  <th style={s.th}>Map to MedLink field</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(h => {
                  const fields = RECORD_FIELDS[recordType] || []
                  return (
                    <tr key={h}>
                      <td style={s.td}><code style={s.code}>{h}</code></td>
                      <td style={s.td}><span style={s.sample}>{String(parsedRows[0]?.[h] || '').slice(0, 50)}</span></td>
                      <td style={s.td}>
                        <select
                          value={mapping[h] || ''}
                          onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                          style={{ width: 200 }}
                        >
                          <option value="">— skip —</option>
                          {fields.filter(f => f.type !== 'calculated').map(f => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                        {mapping[h] && <span style={s.mappedBadge}>✓ mapped</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODE: review ── */}
      {mode === 'review' && (
        <>
          <div style={s.stepHeader}>
            <div>
              <h2 style={s.h2}>
                Review records — {RECORD_TYPE_LABELS[recordType]}
                {hl7Multi && (
                  <span style={s.hl7Badge}>
                    HL7 — type {Object.keys(hl7Multi).indexOf(recordType) + 1} of {Object.keys(hl7Multi).length}
                  </span>
                )}
              </h2>
              <p style={s.sub}>
                Record {reviewIndex + 1} of {reviewRows.length} — edit any field before uploading.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={s.backBtn} onClick={reset}>Cancel</button>
              <button
                style={s.primaryBtn}
                onClick={() => handleUpload(editedRows, recordType)}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : `Upload all ${reviewRows.length} records`}
              </button>
            </div>
          </div>

          {/* Record navigator */}
          <div style={s.reviewNav}>
            <button
              style={s.navBtn}
              onClick={() => setReviewIndex(i => Math.max(0, i - 1))}
              disabled={reviewIndex === 0}
            >← Previous</button>
            <div style={s.reviewPills}>
              {reviewRows.map((_, i) => (
                <div
                  key={i}
                  style={{ ...s.reviewPill, background: i === reviewIndex ? '#1D9E75' : '#e5e5e5', color: i === reviewIndex ? '#fff' : '#6b6b6b' }}
                  onClick={() => setReviewIndex(i)}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <button
              style={s.navBtn}
              onClick={() => setReviewIndex(i => Math.min(reviewRows.length - 1, i + 1))}
              disabled={reviewIndex === reviewRows.length - 1}
            >Next →</button>
          </div>

          <div style={s.formCard}>
            <RecordEntryForm
              key={`${recordType}-${reviewIndex}`}
              recordType={recordType}
              initial={editedRows[reviewIndex] || {}}
              onChange={vals => {
                const next = [...editedRows]
                next[reviewIndex] = vals
                setEditedRows(next)
              }}
              disabled={uploading}
            />
          </div>
        </>
      )}

      {/* ── MODE: done ── */}
      {mode === 'done' && results && (
        <div style={{ ...s.formCard, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>{results.failed === 0 ? '✅' : '⚠️'}</div>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
            {results.failed === 0 ? 'Upload complete' : 'Uploaded with some errors'}
          </h2>
          <p style={{ fontSize: 13, color: '#6b6b6b', lineHeight: 1.6, marginBottom: 20 }}>
            <strong style={{ color: '#1D9E75' }}>{results.success} records</strong> saved to {RECORD_TYPE_LABELS[results.type]}.
            {results.failed > 0 && <> <strong style={{ color: '#a32d2d' }}>{results.failed} records</strong> failed.</>}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={s.backBtn} onClick={reset}>Add more records</button>
            {patientID && (
              <button style={s.primaryBtn} onClick={() => window.location.href = `/patient/${patientID}`}>
                View patient profile
              </button>
            )}
          </div>
        </div>
      )}

    </Layout>
  )
}

const s = {
  h2:           { fontSize: 16, fontWeight: 500, marginBottom: 4 },
  sub:          { fontSize: 13, color: '#6b6b6b', marginBottom: 16 },
  selectorCard: { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '16px 20px', marginBottom: 16 },
  selectorRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  fieldGroup:   { display: 'flex', flexDirection: 'column', gap: 5 },
  label:        { fontSize: 12, color: '#6b6b6b', fontWeight: 500 },
  formCard:     { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '20px 24px', marginBottom: 16 },
  modeGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  modeCard:     { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '28px 24px', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s' },
  modeIcon:     { fontSize: 32, marginBottom: 12 },
  modeTitle:    { fontSize: 15, fontWeight: 500, marginBottom: 6 },
  modeSub:      { fontSize: 12, color: '#6b6b6b', lineHeight: 1.5 },
  formatNote:   { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 1.7 },
  errorBox:     { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#a32d2d', marginBottom: 14 },
  stepHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  backBtn:      { padding: '7px 14px', border: '0.5px solid #e5e5e5', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  primaryBtn:   { padding: '7px 16px', border: 'none', borderRadius: 8, background: '#1D9E75', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { textAlign: 'left', padding: '8px 12px', background: '#f1efe8', fontSize: 11, fontWeight: 500, color: '#6b6b6b', borderBottom: '0.5px solid #e5e5e5' },
  td:           { padding: '9px 12px', borderBottom: '0.5px solid #e5e5e5', verticalAlign: 'middle' },
  code:         { fontFamily: 'monospace', fontSize: 12, background: '#f1efe8', padding: '2px 6px', borderRadius: 4 },
  sample:       { fontSize: 12, color: '#6b6b6b', fontStyle: 'italic' },
  mappedBadge:  { marginLeft: 8, fontSize: 10, color: '#0F6E56', background: '#E1F5EE', padding: '1px 6px', borderRadius: 4 },
  reviewNav:    { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  navBtn:       { padding: '6px 14px', border: '0.5px solid #e5e5e5', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  reviewPills:  { display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 },
  reviewPill:   { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer', fontWeight: 500 },
  hl7Badge:     { marginLeft: 10, fontSize: 11, background: '#E6F1FB', color: '#185FA5', padding: '2px 8px', borderRadius: 4, fontWeight: 400, fontFamily: 'monospace' },
}