import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestBreakGlass, searchPatients } from '../services/api'
import useAuthStore from '../store/authStore'

// Break glass is a 3-step flow:
// Step 1 — Provider identifies the patient (by ID, FAN, or name — unique match only)
// Step 2 — Provider reads and acknowledges the legal warning
// Step 3 — Provider enters mandatory clinical justification, confirms

export default function BreakGlassModal({ onClose }) {
  const { provider } = useAuthStore()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Step 1 — patient lookup (must be unique match via ID or FAN)
  const handleSearch = async () => {
    if (query.trim().length < 3) { setSearchError('Enter at least 3 characters.'); return }
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    try {
      const res = await searchPatients(query.trim(), 'all')
      if (res.data.count === 0) {
        setSearchError('No patient found. Check the ID or Fayda number.')
      } else if (res.data.count > 1) {
        setSearchError(`${res.data.count} patients match. Break glass requires a unique patient. Use the MedLink ID or Fayda number.`)
      } else {
        setSearchResult(res.data.results[0])
      }
    } catch {
      setSearchError('Search failed. Check your connection.')
    } finally {
      setSearching(false)
    }
  }

  // Step 3 — submit
  const handleConfirm = async () => {
    if (justification.trim().length < 30) {
      setSubmitError('Justification must be at least 30 characters. Be specific.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      await requestBreakGlass(searchResult.patientID, justification.trim())
      onClose()
      navigate(`/patient/${searchResult.patientID}`)
    } catch (e) {
      setSubmitError(e.response?.data?.error || 'Failed to grant emergency access. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        {/* Header — always visible */}
        <div style={s.redHeader}>
          <span style={s.redIcon}>⚠</span>
          <div>
            <h2 style={s.h2}>Emergency access — Break Glass</h2>
            <p style={s.headerSub}>Step {step} of 3</p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── STEP 1: Identify patient ── */}
        {step === 1 && (
          <div>
            <p style={s.body}>Enter the patient's MedLink ID or Fayda number. A unique match is required before proceeding.</p>
            <input
              style={s.input}
              type="text"
              placeholder="MedLink ID or Fayda number…"
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchResult(null); setSearchError('') }}
              autoComplete="off"
            />
            {searchError && <p style={s.err}>{searchError}</p>}
            {searchResult && (
              <div style={s.foundCard}>
                <div style={s.foundAvatar}>{searchResult.firstName?.[0]}{searchResult.fatherName?.[0]}</div>
                <div>
                  <div style={{ fontWeight: 500 }}>{searchResult.firstName} {searchResult.fatherName}</div>
                  <div style={{ fontSize: 12, color: '#6b6b6b' }}>{searchResult.dateOfBirth} · {searchResult.sex}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#1D9E75', marginTop: 2 }}>{searchResult.patientID}</div>
                </div>
              </div>
            )}
            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
              <button style={s.searchBtn} onClick={handleSearch} disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
              {searchResult && (
                <button style={s.dangerBtn} onClick={() => setStep(2)}>Continue →</button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Legal acknowledgement ── */}
        {step === 2 && (
          <div>
            <div style={s.warningBox}>
              <p style={s.warningTitle}>Read carefully before proceeding</p>
              <ul style={s.warningList}>
                <li>Patient OTP consent is being bypassed. This is only permitted in genuine clinical emergencies where the patient cannot respond.</li>
                <li>Access is granted immediately for <strong>2 hours</strong>, after which the session automatically expires.</li>
                <li>The patient, their registered emergency contact, and your facility supervisor will be notified by SMS immediately.</li>
                <li>This event is permanently and immutably logged: your name, provider ID, facility, timestamp, and justification are recorded and cannot be deleted.</li>
                <li>Misuse of break glass access is a serious disciplinary and potential legal matter.</li>
              </ul>
            </div>
            <label style={s.checkLabel}>
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              I understand and confirm this is a genuine clinical emergency.
            </label>
            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={() => setStep(1)}>← Back</button>
              <button
                style={{ ...s.dangerBtn, opacity: acknowledged ? 1 : 0.4 }}
                disabled={!acknowledged}
                onClick={() => setStep(3)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Clinical justification ── */}
        {step === 3 && (
          <div>
            <p style={s.body}>
              Accessing: <strong>{searchResult.firstName} {searchResult.fatherName}</strong> · <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{searchResult.patientID}</span>
            </p>
            <div style={s.formGroup}>
              <label style={s.label}>Clinical justification <span style={{ color: '#a32d2d' }}>*</span></label>
              <textarea
                style={s.textarea}
                rows={5}
                placeholder="Describe the clinical situation that requires emergency access. Be specific: patient condition, why OTP consent cannot be obtained, what information is needed and why. Minimum 30 characters."
                value={justification}
                onChange={e => { setJustification(e.target.value); setSubmitError('') }}
              />
              <div style={{ fontSize: 11, color: justification.length < 30 ? '#a32d2d' : '#1D9E75', marginTop: 4 }}>
                {justification.length} characters {justification.length < 30 ? `(${30 - justification.length} more needed)` : '✓'}
              </div>
            </div>
            {submitError && <p style={s.err}>{submitError}</p>}
            <div style={s.footer}>
              <button style={s.cancelBtn} onClick={() => setStep(2)}>← Back</button>
              <button
                style={{ ...s.dangerBtn, opacity: submitting ? 0.6 : 1 }}
                disabled={submitting || justification.trim().length < 30}
                onClick={handleConfirm}
              >
                {submitting ? 'Granting access…' : '⚠ Grant emergency access'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, width: 460, maxWidth: '90vw', overflow: 'hidden' },
  redHeader: { background: '#FCEBEB', borderTop: '4px solid #E24B4A', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 },
  redIcon: { fontSize: 22, color: '#E24B4A', flexShrink: 0 },
  h2: { fontSize: 15, fontWeight: 500, color: '#A32D2D', margin: 0 },
  headerSub: { fontSize: 11, color: '#c97070', margin: '2px 0 0' },
  closeBtn: { marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#a32d2d', padding: 4 },
  body: { fontSize: 13, color: '#5f5e5a', padding: '16px 20px 8px', lineHeight: 1.5 },
  input: { display: 'block', width: '100%', padding: '9px 12px', border: '0.5px solid #e5e5e5', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, margin: '8px 20px 0', boxSizing: 'border-box', width: 'calc(100% - 40px)' },
  err: { fontSize: 12, color: '#a32d2d', margin: '6px 20px 0', lineHeight: 1.4 },
  foundCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#E1F5EE', border: '0.5px solid #9fe1cb', borderRadius: 8, padding: '10px 14px', margin: '12px 20px 0', fontSize: 13 },
  foundAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#0F6E56', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 500, fontSize: 13, flexShrink: 0 },
  warningBox: { margin: '0 20px', background: '#FCEBEB', border: '0.5px solid #f7c1c1', borderRadius: 8, padding: '14px 16px' },
  warningTitle: { fontWeight: 500, fontSize: 13, color: '#a32d2d', marginBottom: 10 },
  warningList: { paddingLeft: 18, fontSize: 13, color: '#5f5e5a', lineHeight: 1.7 },
  checkLabel: { display: 'flex', alignItems: 'flex-start', margin: '14px 20px 0', fontSize: 13, color: '#1a1a1a', cursor: 'pointer', lineHeight: 1.5 },
  formGroup: { padding: '0 20px' },
  label: { display: 'block', fontSize: 12, color: '#6b6b6b', marginBottom: 6 },
  textarea: { width: '100%', padding: '10px', border: '0.5px solid #e5e5e5', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' },
  footer: { display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '16px 20px' },
  cancelBtn: { padding: '7px 16px', border: '0.5px solid #e5e5e5', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  searchBtn: { padding: '7px 16px', border: 'none', borderRadius: 8, background: '#185FA5', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  dangerBtn: { padding: '7px 16px', border: 'none', borderRadius: 8, background: '#E24B4A', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}