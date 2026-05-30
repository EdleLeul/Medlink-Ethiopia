import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import useAuthStore from '../store/authStore'
import BreakGlassModal from '../modals/BreakGlassModal'

export default function Layout({ title, children }) {
  const { provider, activePatient, clearProvider, clearActivePatient } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showBG, setShowBG] = useState(false)

  const handleLogout = async () => {
    await signOut(auth)
    clearProvider()
    clearActivePatient()
    navigate('/login')
  }

  const patientID  = activePatient?.patientID
  const hasPatient = !!patientID

  const minutesLeft = activePatient?.sessionExpiry
    ? Math.max(0, Math.round((new Date(activePatient.sessionExpiry) - Date.now()) / 60000))
    : null

  const NavItem = ({ label, icon, path }) => {
    const active = location.pathname === path || location.pathname.startsWith(path + '/')
    return (
      <div onClick={() => navigate(path)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', fontSize: 13, cursor: 'pointer',
        color: active ? '#fff' : 'rgba(255,255,255,0.6)',
        background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
        borderRadius: 8, margin: '1px 8px',
        fontWeight: active ? 500 : 400,
        transition: 'all 0.15s',
      }}>
        <span style={{ fontSize: 15, width: 20, textAlign: 'center', opacity: active ? 1 : 0.7 }}>{icon}</span>
        {label}
      </div>
    )
  }

  const patientData = activePatient?.patientData
  const patientFullName = patientData
    ? [patientData.firstName, patientData.fatherName || patientData.lastName, patientData.grandfatherName].filter(Boolean).join(' ')
    : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F0F4F2' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 230, flexShrink: 0,
        background: 'linear-gradient(175deg, #0a5c47 0%, #1a9068 60%, #1D9E75 100%)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
      }}>

        {/* Logo */}
        <div style={{ padding: '22px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>
            MedLink Ethiopia
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
            Provider Portal
          </div>
        </div>

        {/* Provider card — teal gradient card matching patient app */}
        <div style={{
          margin: '12px 10px 4px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '12px 14px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {provider?.providerName?.[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {provider?.providerName || '—'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                {provider?.role || 'Provider'}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', marginBottom: 2 }}>
            {provider?.providerID || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
            {provider?.facilityName || '—'}
          </div>
        </div>

        {/* Active patient card */}
        {hasPatient && patientData && (
          <div style={{
            margin: '6px 10px 4px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
              Active patient
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0,
              }}>
                {patientData.firstName?.[0]}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {patientFullName}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginTop: 1 }}>
                  {patientID}
                </div>
              </div>
            </div>
            {minutesLeft !== null && (
              <div style={{
                marginTop: 8, fontSize: 10, padding: '4px 8px', borderRadius: 6,
                background: minutesLeft < 10 ? 'rgba(226,75,74,0.3)' : 'rgba(255,255,255,0.1)',
                color: minutesLeft < 10 ? '#ffb3b3' : 'rgba(255,255,255,0.6)',
                display: 'inline-block',
              }}>
                {activePatient?.accessType === 'BREAK_GLASS' ? '⚠ Emergency · ' : '🔒 '}
                {minutesLeft} min remaining
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 8, overflowY: 'auto' }}>
          <div style={sLabel}>Main</div>
          <NavItem label="Search"    icon="🔍" path="/search" />
          <NavItem label="Dashboard" icon="📊" path="/dashboard" />

          {hasPatient && <>
            <div style={sLabel}>Patient</div>
            <NavItem label="Profile"        icon="👤" path={`/patient/${patientID}`} />
            <NavItem label="Referral letter" icon="📨" path={`/patient/${patientID}/referral`} />
          </>}

          <div style={sLabel}>Tools</div>
          <NavItem label="Upload records" icon="⬆" path="/upload" />
          <NavItem label="Audit log"      icon="🛡" path="/auditlog" />
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '8px',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, background: 'rgba(255,255,255,0.07)',
            fontSize: 12, color: 'rgba(255,255,255,0.65)',
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}>
            Sign out
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          height: 56, background: '#fff',
          borderBottom: '1px solid #eaeeec',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{title}</div>
          <button onClick={() => setShowBG(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 16px', border: 'none', borderRadius: 8,
            background: '#E24B4A', color: '#fff',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            letterSpacing: 0.2,
          }}>
            ⚠ Break Glass
          </button>
        </div>

        {/* Scrollable content — constrained width */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ maxWidth: 880, margin: '0 auto' }}>
            {children}
          </div>
        </div>
      </div>

      {showBG && <BreakGlassModal onClose={() => setShowBG(false)} />}
    </div>
  )
}

const sLabel = {
  padding: '10px 22px 3px',
  fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'rgba(255,255,255,0.35)',
}