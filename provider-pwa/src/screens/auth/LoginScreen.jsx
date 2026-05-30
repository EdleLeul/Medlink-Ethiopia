import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../config/firebase'
import useAuthStore from '../../store/authStore'

function generateProviderID(facilityCode) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `${facilityCode.toUpperCase()}-PRV-${suffix}`
}

export default function LoginScreen() {
  const [mode, setMode]               = useState('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [providerName, setProviderName] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [facilityCode, setFacilityCode] = useState('')
  const [role, setRole]               = useState('doctor')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const { setProvider }               = useAuthStore()
  const navigate                      = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      const snap = await getDoc(doc(db, 'providers', cred.user.uid))
      if (!snap.exists()) {
        setError('No provider profile found. Contact your administrator.')
        setLoading(false); return
      }
      setProvider({ uid: cred.user.uid, email: cred.user.email, ...snap.data() })
      navigate('/search')
    } catch (err) {
      setError(friendlyError(err.code))
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!providerName.trim() || !facilityName.trim() || !facilityCode.trim()) {
      setError('All fields are required.'); return
    }
    setLoading(true); setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const providerID = generateProviderID(facilityCode.trim())
      const profileData = {
        providerID, providerName: providerName.trim(),
        facilityName: facilityName.trim(),
        facilityCode: facilityCode.trim().toUpperCase(),
        role, email: email.trim(),
        createdAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'providers', cred.user.uid), profileData)
      setProvider({ uid: cred.user.uid, ...profileData })
      navigate('/search')
    } catch (err) {
      setError(friendlyError(err.code))
      setLoading(false)
    }
  }

  const friendlyError = (code) => ({
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
  }[code] || 'Something went wrong. Try again.')

  return (
    <div style={s.page}>
      {/* Left panel — branding */}
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.brandIcon}>🏥</div>
          <div style={s.brandTitle}>MedLink Ethiopia</div>
          <div style={s.brandSub}>
            Secure, patient-centred digital health records across every facility
          </div>
        </div>
        {/* Teal info card matching patient app style */}
        <div style={s.infoCard}>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>🔒</span>
            <span>OTP-verified patient access</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>📋</span>
            <span>Full EMR record history</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>📨</span>
            <span>Digital referral letters</span>
          </div>
          <div style={s.infoRow}>
            <span style={s.infoIcon}>⬆</span>
            <span>CSV / HL7 record import</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </div>
            <div style={s.cardSub}>Provider Portal</div>
          </div>

          {/* Toggle */}
          <div style={s.toggle}>
            <button
              style={{ ...s.toggleBtn, ...(mode === 'login' ? s.toggleActive : {}) }}
              onClick={() => { setMode('login'); setError('') }}
            >Sign in</button>
            <button
              style={{ ...s.toggleBtn, ...(mode === 'register' ? s.toggleActive : {}) }}
              onClick={() => { setMode('register'); setError('') }}
            >Register</button>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            {mode === 'register' && (
              <>
                <Field label="Full name">
                  <input value={providerName} onChange={e => setProviderName(e.target.value)}
                    placeholder="e.g. Dr. Selam Bekele" required />
                </Field>
                <div style={s.row2}>
                  <Field label="Facility name">
                    <input value={facilityName} onChange={e => setFacilityName(e.target.value)}
                      placeholder="e.g. Black Lion Hospital" required />
                  </Field>
                  <Field label="Facility code">
                    <input value={facilityCode} onChange={e => setFacilityCode(e.target.value)}
                      placeholder="e.g. AAU-HOS" required />
                  </Field>
                </div>
                <Field label="Role">
                  <select value={role} onChange={e => setRole(e.target.value)}>
                    <option value="doctor">Doctor</option>
                    <option value="records_officer">Records officer</option>
                    <option value="nurse">Nurse</option>
                  </select>
                </Field>
              </>
            )}

            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required autoComplete="email" />
            </Field>
            <Field label="Password">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </Field>

            {error && <div style={s.error}>{error}</div>}

            <button type="submit" style={s.submit} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={s.footNote}>
              Your Provider ID is generated automatically and shown in your profile after registration.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#6b6b6b', marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const s = {
  page:        { height: '100vh', display: 'flex', background: '#F0F4F2' },

  // Left branding panel
  left:        { width: 420, flexShrink: 0, background: 'linear-gradient(175deg, #0a5c47 0%, #1a9068 60%, #1D9E75 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 44px' },
  brand:       { marginBottom: 40 },
  brandIcon:   { fontSize: 36, marginBottom: 14 },
  brandTitle:  { fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 10, letterSpacing: 0.3 },
  brandSub:    { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 300 },
  infoCard:    { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '18px 20px', backdropFilter: 'blur(4px)' },
  infoRow:     { display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', fontSize: 13, color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  infoIcon:    { fontSize: 16, width: 24, textAlign: 'center' },

  // Right form panel
  right:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card:        { background: '#fff', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #eaeeec' },
  cardHeader:  { marginBottom: 22 },
  cardTitle:   { fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 },
  cardSub:     { fontSize: 13, color: '#6b6b6b' },
  toggle:      { display: 'flex', border: '1px solid #e8e8e8', borderRadius: 10, overflow: 'hidden', marginBottom: 22 },
  toggleBtn:   { flex: 1, padding: '9px', border: 'none', background: '#fff', color: '#6b6b6b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  toggleActive:{ background: '#E1F5EE', color: '#0F6E56', fontWeight: 600 },
  row2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  error:       { background: '#FCEBEB', border: '1px solid #f7c1c1', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#a32d2d', marginBottom: 14, lineHeight: 1.4 },
  submit:      { width: '100%', padding: '11px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #1D9E75, #0a5c47)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4, letterSpacing: 0.2 },
  footNote:    { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 16, lineHeight: 1.5 },
}