import { useState, useEffect } from 'react'
import { RECORD_FIELDS, CIEL_LAB_CONCEPTS } from '../config/clinicalConstants'

/**
 * RecordEntryForm
 * Renders a structured form for any MedLink record type.
 * Used both for manual entry and for editing auto-filled CSV/HL7 data.
 *
 * Props:
 *   recordType  — string key from RECORD_FIELDS
 *   initial     — object of pre-filled values (from CSV/HL7 parse or empty)
 *   onChange    — called with updated values on every change
 *   onSubmit    — called with final values when form is submitted
 *   submitLabel — string for submit button
 *   disabled    — bool
 */
export default function RecordEntryForm({ recordType, initial = {}, onChange, onSubmit, submitLabel = 'Save record', disabled = false }) {
  const fields = RECORD_FIELDS[recordType] || []
  const [values, setValues] = useState(buildInitial(fields, initial))
  const [errors, setErrors] = useState({})
  const [cielSearch, setCielSearch] = useState('')

  useEffect(() => {
    setValues(buildInitial(fields, initial))
  }, [recordType, JSON.stringify(initial)])

  const update = (key, val) => {
    const next = { ...values, [key]: val }
    // Recalculate any calculated fields
    fields.forEach(f => {
      if (f.type === 'calculated' && f.calculate) {
        const calc = f.calculate(next)
        if (calc !== null) next[f.key] = calc
      }
    })
    setValues(next)
    setErrors(e => ({ ...e, [key]: null }))
    onChange?.(next)
  }

  const validate = () => {
    const errs = {}
    fields.forEach(f => {
      if (f.required && !values[f.key]?.toString().trim()) {
        errs[f.key] = `${f.label} is required`
      }
      if (f.type === 'number' && values[f.key] !== '' && values[f.key] !== undefined) {
        const n = parseFloat(values[f.key])
        if (f.min !== undefined && n < f.min) errs[f.key] = `Minimum is ${f.min} ${f.unit || ''}`
        if (f.max !== undefined && n > f.max) errs[f.key] = `Maximum is ${f.max} ${f.unit || ''}`
      }
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit?.(attachFHIRMeta(values, recordType))
  }

  return (
    <div>
      <div style={s.grid}>
        {fields.map(f => renderField(f, values, errors, update, cielSearch, setCielSearch, disabled))}
      </div>
      {onSubmit && (
        <div style={s.footer}>
          <button style={s.submitBtn} onClick={handleSubmit} disabled={disabled}>
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Field renderer
// ─────────────────────────────────────────────────────────────────────────────
function renderField(f, values, errors, update, cielSearch, setCielSearch, disabled) {
  const val = values[f.key] ?? ''
  const err = errors[f.key]
  const warn = f.warning ? f.warning(parseFloat(val)) : null
  const isFullWidth = f.type === 'textarea' || f.type === 'ciel'

  const wrapper = (children) => (
    <div key={f.key} style={{ ...s.fieldWrap, ...(isFullWidth ? s.fullWidth : {}) }}>
      <label style={s.label}>
        {f.label}
        {f.required && <span style={s.req}> *</span>}
        {f.loinc && <span style={s.loincBadge} title={`LOINC ${f.loinc.code}`}>LOINC {f.loinc.code}</span>}
        {f.unit && <span style={s.unitBadge}>{f.unit}</span>}
      </label>
      {children}
      {err && <div style={s.err}>{err}</div>}
      {warn && !err && <div style={s.warn}>⚠ {warn}</div>}
      {f.type === 'calculated' && val && (
        <div style={s.calcNote}>Auto-calculated from height and weight</div>
      )}
    </div>
  )

  if (f.type === 'calculated') {
    return wrapper(
      <input
        value={val || '—'}
        readOnly
        style={{ ...s.input, background: '#f1efe8', color: warn ? '#a32d2d' : '#1a1a1a', fontWeight: warn ? 500 : 400 }}
      />
    )
  }

  if (f.type === 'select') {
    return wrapper(
      <select value={val} onChange={e => update(f.key, e.target.value)} disabled={disabled} style={s.input}>
        <option value="">— select —</option>
        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (f.type === 'slider') {
    return wrapper(
      <div>
        <div style={s.sliderRow}>
          <input
            type="range"
            min={f.min} max={f.max} step={f.step || 1}
            value={val || f.min}
            onChange={e => update(f.key, e.target.value)}
            disabled={disabled}
            style={{ flex: 1 }}
          />
          <span style={{ ...s.sliderVal, color: warn ? '#a32d2d' : 'var(--teal)' }}>
            {val || f.min} {f.unit}
          </span>
        </div>
        <div style={s.sliderRange}>
          <span>{f.min} {f.unit}</span>
          <span>{f.max} {f.unit}</span>
        </div>
      </div>
    )
  }

  if (f.type === 'number') {
    return wrapper(
      <div style={s.numberRow}>
        <input
          type="number"
          min={f.min} max={f.max} step={f.step || 1}
          value={val}
          onChange={e => update(f.key, e.target.value)}
          disabled={disabled}
          placeholder={`${f.min ?? ''} – ${f.max ?? ''}`}
          style={{ ...s.input, ...(warn ? s.inputWarn : {}) }}
        />
        {f.min !== undefined && (
          <span style={s.rangeHint}>{f.min} – {f.max} {f.unit}</span>
        )}
      </div>
    )
  }

  if (f.type === 'textarea') {
    return wrapper(
      <textarea
        value={val}
        onChange={e => update(f.key, e.target.value)}
        disabled={disabled}
        placeholder={f.placeholder || ''}
        rows={3}
        style={s.textarea}
      />
    )
  }

  if (f.type === 'date') {
    return wrapper(
      <input
        type="date"
        value={val}
        onChange={e => update(f.key, e.target.value)}
        disabled={disabled}
        max={new Date().toISOString().split('T')[0]}
        style={s.input}
      />
    )
  }

  // CIeL concept picker — searchable dropdown of LOINC-aligned lab tests
  if (f.type === 'ciel') {
    const selected = CIEL_LAB_CONCEPTS.find(c => c.cielID === val)
    const filtered = cielSearch.length > 1
      ? CIEL_LAB_CONCEPTS.filter(c =>
          c.display.toLowerCase().includes(cielSearch.toLowerCase()) ||
          c.loincCode.includes(cielSearch) ||
          c.cielID.includes(cielSearch)
        )
      : CIEL_LAB_CONCEPTS

    return wrapper(
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search test name, LOINC code, or CIeL ID…"
          value={selected ? selected.display : cielSearch}
          onChange={e => { setCielSearch(e.target.value); if (selected) update(f.key, '') }}
          onFocus={() => { if (selected) { update(f.key, ''); setCielSearch('') } }}
          style={s.input}
          disabled={disabled}
        />
        {!selected && (
          <div style={s.cielDropdown}>
            {filtered.slice(0, 12).map(c => (
              <div
                key={c.cielID}
                style={s.cielOption}
                onClick={() => { update(f.key, c.cielID); setCielSearch('') }}
              >
                <div style={s.cielName}>{c.display}</div>
                <div style={s.cielMeta}>
                  <span style={s.cielBadge}>CIeL {c.cielID}</span>
                  <span style={s.cielBadge}>LOINC {c.loincCode}</span>
                  {c.unit && <span style={s.unitBadge}>{c.unit}</span>}
                  {c.normalRange && <span style={s.rangeBadge}>Ref: {c.normalRange}</span>}
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={s.cielEmpty}>No matching concept found</div>}
          </div>
        )}
        {selected && (
          <div style={s.cielSelected}>
            <span style={s.cielBadge}>CIeL {selected.cielID}</span>
            <span style={s.cielBadge}>LOINC {selected.loincCode}</span>
            {selected.unit && <span style={s.unitBadge}>{selected.unit}</span>}
            <span style={s.rangeBadge}>Ref: {selected.normalRange}</span>
            <button style={s.clearBtn} onClick={() => { update(f.key, ''); setCielSearch('') }}>✕</button>
          </div>
        )}
      </div>
    )
  }

  // Default: text
  return wrapper(
    <input
      type="text"
      value={val}
      onChange={e => update(f.key, e.target.value)}
      disabled={disabled}
      placeholder={f.placeholder || ''}
      style={s.input}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildInitial(fields, initial) {
  const out = {}
  fields.forEach(f => { out[f.key] = initial[f.key] ?? '' })
  return out
}

function attachFHIRMeta(values, recordType) {
  // Attach FHIR resource metadata so the backend can tag records correctly
  const fhirMap = {
    consultations:   { resourceType: 'Encounter' },
    diagnoses:       { resourceType: 'Condition' },
    medications:     { resourceType: 'MedicationStatement' },
    labResults:      { resourceType: 'Observation', category: 'laboratory' },
    vitals:          { resourceType: 'Observation', category: 'vital-signs' },
    allergies:       { resourceType: 'AllergyIntolerance' },
    vaccinations:    { resourceType: 'Immunization' },
    surgicalHistory: { resourceType: 'Procedure' },
    familyHistory:   { resourceType: 'FamilyMemberHistory' },
    radiology:       { resourceType: 'ImagingStudy' },
  }
  return { ...values, _fhir: fhirMap[recordType] || {} }
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  grid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' },
  fieldWrap:  {},
  fullWidth:  { gridColumn: '1 / -1' },
  label:      { display: 'block', fontSize: 12, color: '#6b6b6b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  req:        { color: '#a32d2d' },
  loincBadge: { fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' },
  unitBadge:  { fontSize: 10, background: '#f1efe8', color: '#5f5e5a', padding: '1px 6px', borderRadius: 4 },
  rangeBadge: { fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 6px', borderRadius: 4 },
  input:      { width: '100%', padding: '8px 10px', border: '0.5px solid #e5e5e5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  inputWarn:  { borderColor: '#E24B4A', background: '#FCEBEB' },
  textarea:   { width: '100%', padding: '8px 10px', border: '0.5px solid #e5e5e5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  err:        { fontSize: 11, color: '#a32d2d', marginTop: 4 },
  warn:       { fontSize: 11, color: '#BA7517', marginTop: 4, background: '#FAEEDA', padding: '3px 8px', borderRadius: 4 },
  calcNote:   { fontSize: 10, color: '#999', marginTop: 3 },
  sliderRow:  { display: 'flex', alignItems: 'center', gap: 12 },
  sliderVal:  { fontWeight: 500, fontSize: 14, minWidth: 60, textAlign: 'right' },
  sliderRange:{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999', marginTop: 3 },
  numberRow:  { display: 'flex', alignItems: 'center', gap: 8 },
  rangeHint:  { fontSize: 11, color: '#999', flexShrink: 0, whiteSpace: 'nowrap' },
  footer:     { marginTop: 20, display: 'flex', justifyContent: 'flex-end' },
  submitBtn:  { padding: '8px 20px', border: 'none', borderRadius: 8, background: '#1D9E75', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  // CIeL picker
  cielDropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', zIndex: 50, maxHeight: 280, overflowY: 'auto', marginTop: 2 },
  cielOption:   { padding: '10px 14px', cursor: 'pointer', borderBottom: '0.5px solid #f1efe8' },
  cielName:     { fontSize: 13, fontWeight: 500, marginBottom: 4 },
  cielMeta:     { display: 'flex', gap: 6, flexWrap: 'wrap' },
  cielBadge:    { fontSize: 10, background: '#E6F1FB', color: '#185FA5', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' },
  cielSelected: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  cielEmpty:    { padding: '12px 14px', fontSize: 13, color: '#999', textAlign: 'center' },
  clearBtn:     { background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, padding: '1px 4px' },
}