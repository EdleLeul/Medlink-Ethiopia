import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/authStore'
import api from '../../services/api'

export default function DashboardScreen() {
  const { provider, activePatient } = useAuthStore()
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load audit logs for the active patient if one is in session
    if (activePatient?.patientID) {
      api.get(`/patients/${activePatient.patientID}/auditlog`)
        .then(res => setRecentLogs((res.data.logs || []).slice(0, 5)))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [activePatient])

  const fmt = (ts) => {
    if (!ts) return '—'
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)
    return d.toLocaleString('en-ET', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const accessLabel = (type) => {
    if (type === 'BREAK_GLASS') return { label: 'Emergency access', color: '#a32d2d', bg: '#fcebeb' }
    if (type === 'OTP')         return { label: 'OTP access',        color: '#0F6E56', bg: '#E1F5EE' }
    if (type === 'UPLOAD')      return { label: 'Record uploaded',   color: '#185FA5', bg: '#E6F1FB' }
    if (type === 'REFERRAL')    return { label: 'Referral',          color: '#BA7517', bg: '#FAEEDA' }
    return { label: type, color: '#5f5e5a', bg: '#f1efe8' }
  }

  return (
    <Layout title="Dashboard">

      {/* Provider info card */}
      <div style={s.card}>
        <div style={s.provRow}>
          <div style={s.provAvatar}>
            {provider?.providerName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={s.provName}>{provider?.providerName}</div>
            <div style={s.provID}>{provider?.providerID}</div>
            <div style={s.provFacility}>{provider?.facilityName} · {provider?.role}</div>
          </div>
        </div>
      </div>

      {/* Active session card */}
      {activePatient && (
        <div style={{ ...s.card, background: '#E1F5EE', border: '0.5px solid #9fe1cb' }}>
          <div style={{ fontSize: 12, color: 'var(--teal-dark)', fontWeight: 500, marginBottom: 6 }}>
            {activePatient.accessType === 'BREAK_GLASS' ? '⚠ Active emergency session' : '🔒 Active OTP session'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {[activePatient.patientData?.firstName, activePatient.patientData?.fatherName || activePatient.patientData?.lastName, activePatient.patientData?.grandfatherName].filter(Boolean).join(' ')}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--teal)', marginTop: 3 }}>
            {activePatient.patientID}
          </div>
        </div>
      )}

      {/* Recent activity for active patient */}
      <div style={s.card}>
        <h3 style={s.cardTitle}>
          {activePatient ? 'Recent activity — active patient' : 'Recent activity'}
        </h3>
        {loading && <div style={s.muted}>Loading…</div>}
        {!loading && !activePatient && (
          <div style={s.muted}>Search for a patient to see their access history here.</div>
        )}
        {!loading && activePatient && recentLogs.length === 0 && (
          <div style={s.muted}>No access events recorded yet for this patient.</div>
        )}
        {recentLogs.map((log, i) => {
          const lbl = accessLabel(log.accessType)
          return (
            <div key={i} style={{ ...s.logRow, borderBottom: i < recentLogs.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <span style={{ ...s.badge, color: lbl.color, background: lbl.bg }}>{lbl.label}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{log.facilityName || 'Unknown facility'}</div>
                {log.accessType === 'BREAK_GLASS' && log.justification && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                    {log.justification.slice(0, 80)}…
                  </div>
                )}
              </div>
              <div style={s.time}>{fmt(log.timestamp)}</div>
            </div>
          )
        })}
      </div>

    </Layout>
  )
}

const s = {
  card: { background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 14 },
  cardTitle: { fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 14 },
  provRow: { display: 'flex', alignItems: 'center', gap: 14 },
  provAvatar: { width: 48, height: 48, borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, color: 'var(--teal-dark)', flexShrink: 0 },
  provName: { fontSize: 15, fontWeight: 500, marginBottom: 3 },
  provID: { fontFamily: 'monospace', fontSize: 12, color: 'var(--teal)', background: 'var(--teal-light)', padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 4 },
  provFacility: { fontSize: 12, color: 'var(--text-muted)' },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0' },
  badge: { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 },
  time: { fontSize: 11, color: 'var(--text-hint)', flexShrink: 0 },
  muted: { fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' },
}