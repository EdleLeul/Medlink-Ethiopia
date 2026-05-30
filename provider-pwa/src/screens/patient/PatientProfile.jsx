import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/authStore'
import { getPatient, getRecords } from '../../services/api'

import TimelineTab from './TimelineTab'
import ConsultationsTab from './ConsultationsTab'
import MedicationsTab from './MedicationsTab'
import LabsTab from './LabsTab'
import VitalsTab from './VitalsTab'
import RadiologyTab from './RadiologyTab'
import HistoryTab from './HistoryTab'

const TABS = [
  { key: 'timeline',      label: 'Timeline' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'medications',   label: 'Medications' },
  { key: 'labs',          label: 'Labs' },
  { key: 'vitals',        label: 'Vitals' },
  { key: 'radiology',     label: 'Radiology' },
  { key: 'history',       label: 'History' },
]

export default function PatientProfile() {
  const { patientID } = useParams()
  const { activePatient, setActivePatient } = useAuthStore()
  const navigate = useNavigate()

  const [patient, setPatient] = useState(activePatient?.patientData || null)
  const [records, setRecords] = useState({})
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [activeTab, setActiveTab] = useState('timeline')
  const [error, setError] = useState('')

  useEffect(() => {
    loadPatient()
  }, [patientID])

  const loadPatient = async () => {
    try {
      const res = await getPatient(patientID)
      const p = res.data
      setPatient(p)
      // Update store with latest patient data
      setActivePatient({
        ...activePatient,
        patientID,
        patientData: p,
      })
      loadAllRecords()
    } catch {
      setError('Could not load patient. Your session may have expired.')
    }
  }

  const loadAllRecords = async () => {
    setLoadingRecords(true)
    const types = ['consultations','diagnoses','medications','labResults','radiology','allergies','vaccinations','vitals','surgicalHistory','familyHistory','referrals','doctorNotes']
    const loaded = {}
    await Promise.all(types.map(async (type) => {
      try {
        const res = await getRecords(patientID, type)
        loaded[type] = res.data.records || []
      } catch {
        loaded[type] = []
      }
    }))
    setRecords(loaded)
    setLoadingRecords(false)
  }

  const sessionExpiry = activePatient?.sessionExpiry
  const minutesLeft = sessionExpiry
    ? Math.max(0, Math.round((new Date(sessionExpiry) - Date.now()) / 60000))
    : null

  if (error) {
    return (
      <Layout title="Patient profile">
        <div style={{ background: '#fcebeb', borderRadius: 8, padding: '14px 18px', fontSize: 13, color: '#a32d2d' }}>
          {error}
        </div>
      </Layout>
    )
  }

  if (!patient) {
    return <Layout title="Patient profile"><div style={{ color: '#6b6b6b', fontSize: 13 }}>Loading…</div></Layout>
  }

  const initials = (patient.firstName?.[0] || '') + (patient.fatherName?.[0] || '')
  const fullName = [patient.firstName, patient.fatherName || patient.lastName, patient.grandfatherName].filter(Boolean).join(' ')
  const conditions = records.diagnoses?.filter(d => d.status === 'active') || []
  const allergies = records.allergies || []

  return (
    <Layout title="Patient profile">

      {/* Session bar */}
      {minutesLeft !== null && (
        <div style={{
          ...s.sessionBar,
          background: minutesLeft < 10 ? '#fcebeb' : '#E1F5EE',
          color: minutesLeft < 10 ? '#a32d2d' : '#0F6E56',
          borderColor: minutesLeft < 10 ? '#f7c1c1' : '#9fe1cb',
        }}>
          <span>
            {activePatient?.accessType === 'BREAK_GLASS' ? '⚠ Emergency access — ' : '🔒 OTP session — '}
            expires in <strong>{minutesLeft} minutes</strong>
          </span>
          <span style={{ fontSize: 11, opacity: 0.7 }}>
            Patient: {patient.phone}
          </span>
        </div>
      )}

      {/* Profile header */}
      <div style={s.profileCard}>
        <div style={s.profileTop}>
          <div style={s.avatar}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={s.name}>{fullName}</div>
            <div style={s.patientID}>{patient.patientID}</div>
            <div style={s.metaRow}>
              <span style={s.metaItem}>📅 {patient.dateOfBirth} · {patient.sex}</span>
              <span style={s.metaItem}>🩸 {patient.bloodType || 'Unknown'}</span>
              <span style={s.metaItem}>📍 {patient.region}, {patient.city}</span>
              {patient.fanNumber && <span style={s.metaItem}>🪪 FAN: {patient.fanNumber}</span>}
            </div>

            {/* Active conditions from live records */}
            {conditions.length > 0 && (
              <div style={s.conditionsRow}>
                <span style={s.conditionsLabel}>Active conditions:</span>
                {conditions.map((d, i) => (
                  <span key={i} style={s.condBadge}>{d.diagnosisName || d.icdCode}</span>
                ))}
              </div>
            )}
          </div>

          <button
            style={s.referralBtn}
            onClick={() => navigate(`/patient/${patientID}/referral`)}
          >
            📨 Write referral
          </button>
        </div>

        {/* Allergy bar — prominent */}
        {allergies.length > 0 && (
          <div style={s.allergyBar}>
            ⚠ <strong>Allergies:</strong>&nbsp;
            {allergies.map((a, i) => (
              <span key={i}>
                {a.allergen}{a.severity ? ` (${a.severity})` : ''}{i < allergies.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {TABS.map(t => (
          <button
            key={t.key}
            style={{
              ...s.tab,
              color: activeTab === t.key ? 'var(--teal)' : 'var(--text-muted)',
              borderBottom: `2px solid ${activeTab === t.key ? 'var(--teal)' : 'transparent'}`,
              fontWeight: activeTab === t.key ? 500 : 400,
              background: activeTab === t.key ? 'var(--teal-light)' : 'transparent',
            }}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ marginTop: 0 }}>
        {loadingRecords ? (
          <div style={{ color: '#6b6b6b', fontSize: 13, padding: '24px 0' }}>Loading records…</div>
        ) : (
          <>
            {activeTab === 'timeline'      && <TimelineTab records={records} />}
            {activeTab === 'consultations' && <ConsultationsTab records={records.consultations || []} />}
            {activeTab === 'medications'   && <MedicationsTab records={records.medications || []} />}
            {activeTab === 'labs'          && <LabsTab records={records.labResults || []} />}
            {activeTab === 'vitals'        && <VitalsTab records={records.vitals || []} />}
            {activeTab === 'radiology'     && <RadiologyTab records={records.radiology || []} />}
            {activeTab === 'history'       && <HistoryTab surgical={records.surgicalHistory || []} family={records.familyHistory || []} vaccinations={records.vaccinations || []} />}
          </>
        )}
      </div>

    </Layout>
  )
}

const s = {
  sessionBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, border: '0.5px solid', padding: '7px 14px', fontSize: 12, marginBottom: 14 },
  profileCard: { background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', marginBottom: 0 },
  profileTop: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: '50%', background: 'var(--teal-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 500, color: 'var(--teal-dark)', flexShrink: 0 },
  name: { fontSize: 17, fontWeight: 500, marginBottom: 4 },
  patientID: { fontFamily: 'monospace', fontSize: 12, color: 'var(--teal)', background: 'var(--teal-light)', padding: '2px 10px', borderRadius: 4, display: 'inline-block', marginBottom: 8 },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 12 },
  metaItem: { fontSize: 12, color: 'var(--text-muted)' },
  conditionsRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, alignItems: 'center' },
  conditionsLabel: { fontSize: 11, color: 'var(--text-muted)' },
  condBadge: { fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#FCEBEB', color: '#A32D2D' },
  referralBtn: { flexShrink: 0, padding: '7px 14px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--white)', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' },
  allergyBar: { background: 'var(--red-light)', border: '0.5px solid #f7c1c1', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, color: 'var(--red)', marginTop: 4 },
  tabs: { display: 'flex', borderBottom: '0.5px solid var(--border)', marginTop: 16, marginBottom: 0, overflowX: 'auto' },
  tab: { padding: '9px 16px', fontSize: 13, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' },
}