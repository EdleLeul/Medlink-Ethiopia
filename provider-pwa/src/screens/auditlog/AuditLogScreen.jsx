import { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { getAuditLog } from '../../services/api'
import useAuthStore from '../../store/authStore'

// Audit log shows access events for the currently active patient only.
// It does NOT show provider names or other patient identities.
// It shows: facility name, access type, timestamp, and for break glass — justification summary.

export default function AuditLogScreen() {
  const { activePatient } = useAuthStore()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activePatient?.patientID) { setLoading(false); return }
    fetchLog()
  }, [activePatient])

  const fetchLog = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAuditLog(activePatient.patientID)
      setLogs(res.data.logs || [])
    } catch {
      setError('Could not load audit log.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (ts) => {
    if (!ts) return '—'
    const d = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts)
    return d.toLocaleString('en-ET', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const accessLabel = (type) => {
    if (type === 'BREAK_GLASS') return { label: 'Emergency access', color: '#a32d2d', bg: '#fcebeb' }
    if (type === 'OTP') return { label: 'OTP access', color: '#0F6E56', bg: '#E1F5EE' }
    if (type === 'UPLOAD') return { label: 'Record uploaded', color: '#185FA5', bg: '#E6F1FB' }
    if (type === 'REFERRAL') return { label: 'Referral published', color: '#BA7517', bg: '#FAEEDA' }
    return { label: type, color: '#5f5e5a', bg: '#f1efe8' }
  }

  if (!activePatient) {
    return (
      <Layout title="Audit log">
        <div style={s.empty}>No active patient session. Search for a patient first.</div>
      </Layout>
    )
  }

  return (
    <Layout title="Audit log">
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>Access history</h2>
          <p style={s.sub}>
            {activePatient.patientData?.firstName} {activePatient.patientData?.fatherName} · <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{activePatient.patientID}</span>
          </p>
        </div>
        <div style={s.notice}>
          Records show the <strong>facility</strong> that accessed this patient. Individual provider names are not displayed here to maintain inter-facility privacy.
        </div>
      </div>

      {loading && <div style={s.loading}>Loading…</div>}
      {error && <div style={s.errorBox}>{error}</div>}

      {!loading && logs.length === 0 && (
        <div style={s.empty}>No access events recorded for this patient yet.</div>
      )}

      <div style={s.card}>
        {logs.map((log, i) => {
          const lbl = accessLabel(log.accessType)
          return (
            <div key={i} style={{ ...s.logRow, borderBottom: i < logs.length - 1 ? '0.5px solid #e5e5e5' : 'none' }}>
              <div style={{ ...s.badge, color: lbl.color, background: lbl.bg }}>{lbl.label}</div>
              <div style={s.logBody}>
                <div style={s.logFacility}>{log.facilityName || 'Unknown facility'}</div>
                {log.accessType === 'BREAK_GLASS' && log.justification && (
                  <div style={s.justification}>
                    Justification on record: "{log.justification.slice(0, 120)}{log.justification.length > 120 ? '…' : ''}"
                  </div>
                )}
              </div>
              <div style={s.logTime}>{formatTime(log.timestamp)}</div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}

const s = {
  header: { marginBottom: 20 },
  h2: { fontSize: 16, fontWeight: 500, marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b6b6b' },
  notice: { marginTop: 12, background: '#f1efe8', border: '0.5px solid #d3d1c7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#5f5e5a', lineHeight: 1.5 },
  card: { background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' },
  logRow: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px' },
  badge: { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 },
  logBody: { flex: 1 },
  logFacility: { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  justification: { fontSize: 12, color: '#6b6b6b', marginTop: 4, fontStyle: 'italic', lineHeight: 1.4 },
  logTime: { fontSize: 11, color: '#999', flexShrink: 0, textAlign: 'right' },
  loading: { color: '#6b6b6b', fontSize: 13, padding: '20px 0' },
  errorBox: { background: '#fcebeb', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#a32d2d', marginBottom: 12 },
  empty: { color: '#6b6b6b', fontSize: 13, padding: '40px 0', textAlign: 'center' },
}