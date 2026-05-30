import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import OTPModal from '../../modals/OTPModal'
import { searchPatients } from '../../services/api'

export default function SearchScreen() {
  const [query, setQuery]       = useState('')
  const [field, setField]       = useState('all')
  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [otpTarget, setOtpTarget] = useState(null)
  const navigate = useNavigate()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim().length >= 2) runSearch(query.trim())
  }

  const runSearch = async (q) => {
    setLoading(true)
    setError('')
    setResults(null)
    try {
      const res = await searchPatients(q, field)
      const term = q.trim().toLowerCase()
      const all  = res.data.results || []

      // Only show a result on exact full match — never partial suggestions
      const matched = all.filter(p => {
        // Build full name using fatherName with lastName fallback
        const fullName = [
          p.firstName,
          p.fatherName || p.lastName,
          p.grandfatherName,
        ].filter(Boolean).join(' ').toLowerCase()

        const pid = (p.patientID  || '').toLowerCase()
        const fan = (p.fanNumber  || '').replace(/\s/g, '')

        if (field === 'id')   return pid === term
        if (field === 'fan')  return fan === term.replace(/\s/g, '')
        if (field === 'name') return fullName === term
        // All fields — exact match on any
        return (
          pid === term ||
          fan === term.replace(/\s/g, '') ||
          fullName === term
        )
      })

      setResults(matched)
    } catch {
      setError('Search failed. Make sure the backend is running.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (patient) => setOtpTarget(patient)

  const handleOTPSuccess = (patientID) => {
    setOtpTarget(null)
    navigate(`/patient/${patientID}`)
  }

  return (
    <Layout title="Patient search">
      <div style={s.hero}>
        <h1 style={s.h1}>Find a patient</h1>
        <p style={s.sub}>
          Enter the complete MedLink ID, Fayda national ID, or full name
          (first and father's name) then press Search
        </p>
      </div>

      <div style={s.box}>
        {/* Search row */}
        <div style={s.inputRow}>
          <div style={s.inputWrap}>
            <span style={s.icon}>🔍</span>
            <input
              style={s.input}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setResults(null); setError('') }}
              onKeyDown={handleKeyDown}
              placeholder="Type here…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <button
            style={{ ...s.searchBtn, opacity: query.trim().length < 2 ? 0.5 : 1 }}
            disabled={query.trim().length < 2 || loading}
            onClick={() => runSearch(query.trim())}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Field filters */}
        <div style={s.filters}>
          {[
            { key: 'all',  label: 'All fields' },
            { key: 'id',   label: 'MedLink ID' },
            { key: 'fan',  label: 'Fayda ID'   },
            { key: 'name', label: 'Name'        },
          ].map(f => (
            <button
              key={f.key}
              style={{ ...s.chip, ...(field === f.key ? s.chipActive : {}) }}
              onClick={() => setField(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {error && <div style={s.errorBox}>{error}</div>}

        {results !== null && results.length === 0 && (
          <div style={s.infoBox}>
            No patients found matching "{query}". Check the spelling or try a different field.
          </div>
        )}

        {results !== null && results.length === 1 && (
          <div style={s.resultCard} onClick={() => handleSelect(results[0])}>
            <div style={s.avatar}>
              {results[0].firstName?.[0]}{(results[0].fatherName || results[0].lastName)?.[0]}
            </div>
            <div style={s.resultInfo}>
              <div style={s.resultName}>
                {[results[0].firstName, results[0].fatherName || results[0].lastName, results[0].grandfatherName].filter(Boolean).join(' ')}
              </div>
              <div style={s.resultMeta}>
                {results[0].dateOfBirth} · {results[0].sex} · {results[0].region}
              </div>
            </div>
            <span style={s.resultID}>{results[0].patientID}</span>
          </div>
        )}

        {results !== null && results.length > 1 && (
          <div style={s.infoBox}>
            <strong>{results.length} patients</strong> match "{query}". Please refine using
            the full MedLink ID or Fayda number for a unique result.
          </div>
        )}
      </div>

      {otpTarget && (
        <OTPModal
          patient={otpTarget}
          onSuccess={handleOTPSuccess}
          onClose={() => setOtpTarget(null)}
        />
      )}
    </Layout>
  )
}

const s = {
  hero:       { textAlign: 'center', padding: '36px 0 24px' },
  h1:         { fontSize: 24, fontWeight: 600, marginBottom: 8 },
  sub:        { color: '#6b6b6b', fontSize: 13, maxWidth: 480, margin: '0 auto' },
  box:        { maxWidth: 580, margin: '0 auto' },
  inputRow:   { display: 'flex', gap: 0, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderRadius: 12, overflow: 'hidden' },
  inputWrap:  { position: 'relative', flex: 1 },
  icon:       { position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' },
  input:      { width: '100%', padding: '13px 14px 13px 42px', border: '0.5px solid #e8e8e8', borderRight: 'none', borderRadius: '12px 0 0 12px', fontSize: 15, fontFamily: 'inherit', outline: 'none', background: '#fff' },
  searchBtn:  { padding: '0 22px', border: 'none', borderRadius: '0 12px 12px 0', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0 },
  filters:    { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 },
  chip:       { padding: '6px 16px', borderRadius: 20, border: '0.5px solid #e8e8e8', fontSize: 12, cursor: 'pointer', background: '#fff', color: '#6b6b6b', fontFamily: 'inherit' },
  chipActive: { background: '#1D9E75', color: '#fff', borderColor: '#1D9E75', fontWeight: 500 },
  infoBox:    { background: '#f5f5f0', border: '0.5px solid #ddd', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#5f5e5a', textAlign: 'center', lineHeight: 1.5 },
  errorBox:   { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#a32d2d', marginBottom: 10 },
  resultCard: { background: '#fff', border: '0.5px solid #e8e8e8', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' },
  avatar:     { width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, color: '#0F6E56', flexShrink: 0 },
  resultInfo: { flex: 1 },
  resultName: { fontWeight: 500, fontSize: 14 },
  resultMeta: { fontSize: 12, color: '#6b6b6b', marginTop: 3 },
  resultID:   { fontFamily: 'monospace', fontSize: 11, color: '#1D9E75', background: '#E1F5EE', padding: '3px 10px', borderRadius: 6 },
}