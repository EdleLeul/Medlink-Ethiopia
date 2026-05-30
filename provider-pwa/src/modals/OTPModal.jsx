import { useState, useEffect, useRef } from 'react'
import useAuthStore from '../store/authStore'
import { requestOTP, verifyOTP, pollOTPStatus } from '../services/api'

export default function OTPModal({ patient, onSuccess, onClose }) {
  const { provider, setOtpDocID, otpDocID } = useAuthStore()
  const [status, setStatus]       = useState('requesting')
  const [code, setCode]           = useState(['', '', '', '', '', ''])
  const [errorMsg, setErrorMsg]   = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const pollRef    = useRef(null)
  const inputRefs  = useRef([])

  useEffect(() => {
    sendRequest()
    return () => clearInterval(pollRef.current)
  }, [])

  const sendRequest = async () => {
    if (requestSent) return
    setRequestSent(true)
    setStatus('requesting')
    setErrorMsg('')
    try {
      const res = await requestOTP(
        patient.patientID,
        provider.providerName,
        provider.facilityName
      )
      setOtpDocID(res.data.otpDocID)
      setStatus('waiting')
      startPolling(res.data.otpDocID)
    } catch {
      setStatus('error')
      setErrorMsg('Failed to send OTP request. Check your connection and try again.')
      setRequestSent(false) // allow retry only on failure
    }
  }

  const startPolling = (docID) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollOTPStatus(docID)
        if (res.data.status === 'approved') {
          clearInterval(pollRef.current)
          setStatus('entering')
          setTimeout(() => inputRefs.current[0]?.focus(), 100)
        } else if (res.data.status === 'denied') {
          clearInterval(pollRef.current)
          setStatus('denied')
        } else if (res.data.status === 'expired') {
          clearInterval(pollRef.current)
          setStatus('error')
          setErrorMsg('OTP expired. Close and try again.')
        }
      } catch {
        // silently retry on poll errors
      }
    }, 4000)
  }

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...code]
    next[i] = val
    setCode(next)
    if (val && i < 5) inputRefs.current[i + 1]?.focus()
    if (i === 5 && val) setTimeout(() => handleVerify(next), 100)
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  const handleVerify = async (digits = code) => {
    const full = digits.join('')
    if (full.length < 6) { setErrorMsg('Enter all 6 digits.'); return }
    setStatus('verifying')
    setErrorMsg('')
    console.log('OTP DEBUG:', { otpDocID, code: full, patientID: patient.patientID })
    try {
      await verifyOTP(otpDocID, full, patient.patientID)
      clearInterval(pollRef.current)
      onSuccess(patient.patientID)
    } catch (e) {
      setStatus('entering')
      setErrorMsg(e.response?.data?.error || 'Incorrect or expired code. Try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const fullName = [
    patient.firstName,
    patient.fatherName || patient.lastName,
    patient.grandfatherName,
  ].filter(Boolean).join(' ')

  const statusLabel = {
    requesting: { bg: '#E6F1FB', color: '#185FA5', text: 'Sending request to patient…' },
    waiting:    { bg: '#FAEEDA', color: '#BA7517', text: 'Request sent — waiting for patient to approve or share the code. Code expires in 30 minutes.' },
    entering:   { bg: '#E1F5EE', color: '#0F6E56', text: 'Patient approved. Enter the 6-digit code.' },
    verifying:  { bg: '#E1F5EE', color: '#0F6E56', text: 'Verifying…' },
    denied:     { bg: '#FCEBEB', color: '#A32D2D', text: 'Patient denied this access request.' },
    error:      { bg: '#FCEBEB', color: '#A32D2D', text: errorMsg },
  }
  const st = statusLabel[status] || statusLabel.waiting

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.h2}>Patient access request</h2>
            <p style={s.sub}>
              {fullName} · <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{patient.patientID}</span>
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ ...s.statusBar, background: st.bg, color: st.color }}>
          {st.text}
        </div>

        {(status === 'entering' || status === 'verifying' || status === 'waiting') && (
          <>
            <div style={s.otpRow}>
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  style={s.otpInput}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigit(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  disabled={status === 'verifying'}
                  autoComplete="off"
                />
              ))}
            </div>
            {errorMsg && status === 'entering' && <p style={s.error}>{errorMsg}</p>}
          </>
        )}

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          {/* Retry only allowed after a failure — not during waiting/entering */}
          {status === 'error' && (
            <button style={s.primaryBtn} onClick={() => { setRequestSent(false); sendRequest() }}>
              Retry
            </button>
          )}
          {status === 'entering' && (
            <button style={s.primaryBtn} onClick={() => handleVerify()}>Verify</button>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal:      { background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '90vw' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  h2:         { fontSize: 16, fontWeight: 500, margin: 0 },
  sub:        { fontSize: 12, color: '#6b6b6b', marginTop: 4 },
  closeBtn:   { background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#999', padding: 4 },
  statusBar:  { borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 20, lineHeight: 1.5 },
  otpRow:     { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 },
  otpInput:   { width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 500, border: '0.5px solid #e5e5e5', borderRadius: 8, fontFamily: 'monospace' },
  error:      { color: '#a32d2d', fontSize: 12, textAlign: 'center', marginBottom: 12 },
  footer:     { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn:  { padding: '6px 16px', border: '0.5px solid #e5e5e5', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  primaryBtn: { padding: '6px 16px', border: 'none', borderRadius: 8, background: '#1D9E75', color: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
}