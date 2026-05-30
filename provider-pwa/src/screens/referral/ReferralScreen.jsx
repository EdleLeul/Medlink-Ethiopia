import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import useAuthStore from '../../store/authStore'
import { publishReferral, getRecords } from '../../services/api'

const URGENCY   = ['Routine', 'Urgent', 'Emergency']
const CONDITION = ['Stable', 'Unstable', 'Critical']

export default function ReferralScreen() {
  const { patientID } = useParams()
  const { provider, activePatient } = useAuthStore()
  const navigate  = useNavigate()
  const patient   = activePatient?.patientData

  const fullName = [
    patient?.firstName,
    patient?.fatherName || patient?.lastName,
    patient?.grandfatherName,
  ].filter(Boolean).join(' ')

  const [form, setForm] = useState({
    chiefComplaint: '', relevantHistory: '', examinationFindings: '',
    investigationsSummary: '', currentMedications: '', diagnosis: '',
    reasonForReferral: '', referredTo: '', speciality: '',
    urgency: 'Routine', conditionAtTransfer: 'Stable',
    transportRequired: 'No', escortName: '', escortPhone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (!patientID) return
    getRecords(patientID, 'medications').then(res => {
      const active = (res.data.records || [])
        .filter(m => m.status === 'Active' || m.status === 'active' || !m.status)
        .map(m => `${m.medicationName} ${m.dosage || ''}`.trim())
        .join(', ')
      if (active) setForm(f => ({ ...f, currentMedications: active }))
    }).catch(() => {})
  }, [patientID])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.reasonForReferral.trim() || !form.referredTo.trim() || !form.diagnosis.trim()) {
      setError('Referred to, diagnosis, and reason for referral are required.')
      return
    }
    setSubmitting(true); setError('')
    try {
      await publishReferral(patientID, {
        ...form,
        patientName: fullName,
        patientID,
        providerName:  provider.providerName,
        providerID:    provider.providerID,
        facilityName:  provider.facilityName,
        referralDate:  new Date().toISOString(),
      })
      setSubmitted(true)
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to publish referral. Try again.')
      setSubmitting(false)
    }
  }

  if (!patient) {
    return (
      <Layout title="Referral letter">
        <div style={{ color: '#6b6b6b', fontSize: 13 }}>No active patient. Search for a patient first.</div>
      </Layout>
    )
  }

  if (submitted) {
    return (
      <Layout title="Referral letter">
        <div style={s.successBox}>
          <div style={s.successIcon}>✓</div>
          <h2 style={s.successTitle}>Referral published</h2>
          <p style={s.successBody}>
            The referral letter has been added to <strong>{fullName}</strong>'s profile.
            The patient will be notified and can download it from their app.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button style={s.btn} onClick={() => navigate(`/patient/${patientID}`)}>Back to profile</button>
            <button style={s.btnPrimary} onClick={() => {
              setSubmitted(false)
              setForm(f => ({ ...f, reasonForReferral: '', referredTo: '', speciality: '', diagnosis: '' }))
            }}>Write another</button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Referral letter">
      {/* Header row */}
      <div style={s.topRow}>
        <div>
          <h2 style={s.h2}>New referral letter</h2>
          <p style={s.sub}>{fullName} · <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{patientID}</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={() => navigate(`/patient/${patientID}`)}>Cancel</button>
          <button style={s.btnPrimary} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Publishing…' : '📨 Publish'}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* ── PATIENT ── */}
      <Section title="Patient (auto-filled)">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Photo placeholder */}
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            {patient.photoURL
              ? <img src={patient.photoURL} alt="Patient"
                  style={{ width: 88, height: 88, borderRadius: 10, objectFit: 'cover', border: '0.5px solid #e8e8e8' }} />
              : <div style={{
                  width: 88, height: 88, borderRadius: 10,
                  background: 'linear-gradient(135deg, #1D9E75, #0a5c47)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, fontWeight: 700, color: '#fff',
                }}>
                  {patient.firstName?.[0]}
                </div>
            }
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 5 }}>ID Photo</div>
          </div>

          {/* Fields grid */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <Field label="Full name (given · father · grandfather)">
              <ReadInput value={fullName} />
            </Field>
            <Field label="MedLink ID">
              <ReadInput value={patientID} mono />
            </Field>
            <Field label="Date of birth · sex">
              <ReadInput value={`${patient.dateOfBirth || '—'} · ${patient.sex || '—'}`} />
            </Field>
            <Field label="Blood type">
              <ReadInput value={patient.bloodType || '—'} />
            </Field>
            <Field label="Fayda national ID (FAN)">
              <ReadInput value={patient.fanNumber || 'Not provided'} mono />
            </Field>
            <Field label="Grandfather's name">
              <ReadInput value={patient.grandfatherName || 'Not provided'} />
            </Field>
          </div>
        </div>
      </Section>

      {/* ── PROVIDER ── */}
      <Section title="Referring provider (auto-filled)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          <Field label="Provider name"><ReadInput value={provider.providerName} /></Field>
          <Field label="Provider ID"><ReadInput value={provider.providerID} mono /></Field>
          <Field label="Facility"><ReadInput value={provider.facilityName} /></Field>
          <Field label="Date"><ReadInput value={new Date().toLocaleDateString('en-ET', { dateStyle: 'long' })} /></Field>
        </div>
      </Section>

      {/* ── CLINICAL ── */}
      <Section title="Clinical details">
        <Field label="Chief complaint and duration" full>
          <textarea rows={2} value={form.chiefComplaint}
            onChange={e => set('chiefComplaint', e.target.value)}
            placeholder="e.g. Uncontrolled hyperglycaemia for 6 weeks…" />
        </Field>
        <Field label="Relevant history" full>
          <textarea rows={2} value={form.relevantHistory}
            onChange={e => set('relevantHistory', e.target.value)}
            placeholder="Key background relevant to this referral…" />
        </Field>
        <Field label="Key examination findings" full>
          <textarea rows={2} value={form.examinationFindings}
            onChange={e => set('examinationFindings', e.target.value)}
            placeholder="e.g. BP 148/92, BMI 27.4…" />
        </Field>
        <Field label="Investigations done and results" full>
          <textarea rows={2} value={form.investigationsSummary}
            onChange={e => set('investigationsSummary', e.target.value)}
            placeholder="e.g. HbA1c 9.2%, FBS 11.4 mmol/L…" />
        </Field>
        <Field label="Current active medications" full>
          <textarea rows={2} value={form.currentMedications}
            onChange={e => set('currentMedications', e.target.value)}
            placeholder="Auto-filled from medication records where available…" />
        </Field>
        <Field label="Provisional / confirmed diagnosis *" full>
          <input value={form.diagnosis}
            onChange={e => set('diagnosis', e.target.value)}
            placeholder="e.g. Uncontrolled Type 2 Diabetes Mellitus" />
        </Field>
        <Field label="Reason for referral *" full>
          <textarea rows={3} value={form.reasonForReferral}
            onChange={e => set('reasonForReferral', e.target.value)}
            placeholder="What do you need the receiving specialist to do?" />
        </Field>
      </Section>

      {/* ── TRANSFER ── */}
      <Section title="Transfer details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          <Field label="Referred to (facility) *">
            <input value={form.referredTo}
              onChange={e => set('referredTo', e.target.value)}
              placeholder="e.g. Tikur Anbessa Specialized Hospital" />
          </Field>
          <Field label="Department / speciality">
            <input value={form.speciality}
              onChange={e => set('speciality', e.target.value)}
              placeholder="e.g. Endocrinology" />
          </Field>
        </div>

        <Field label="Urgency">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {URGENCY.map(u => {
              const active = form.urgency === u
              const col = u === 'Routine' ? ['#E1F5EE','#0F6E56','#1D9E75'] : u === 'Urgent' ? ['#FAEEDA','#BA7517','#BA7517'] : ['#FCEBEB','#A32D2D','#E24B4A']
              return (
                <button key={u} type="button"
                  onClick={() => set('urgency', u)}
                  style={{ padding: '7px 20px', borderRadius: 20, border: `1px solid ${active ? col[2] : '#e8e8e8'}`, background: active ? col[0] : '#fff', color: active ? col[1] : '#6b6b6b', fontSize: 12, cursor: 'pointer', fontWeight: active ? 500 : 400 }}>
                  {u}
                </button>
              )
            })}
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          <Field label="Patient condition at transfer">
            <select value={form.conditionAtTransfer} onChange={e => set('conditionAtTransfer', e.target.value)}>
              {CONDITION.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Transport required">
            <select value={form.transportRequired} onChange={e => set('transportRequired', e.target.value)}>
              <option>No</option>
              <option>Yes — ambulance</option>
              <option>Yes — wheelchair</option>
            </select>
          </Field>
          <Field label="Accompanied by (name)">
            <input value={form.escortName} onChange={e => set('escortName', e.target.value)} placeholder="Escort name" />
          </Field>
          <Field label="Escort contact">
            <input value={form.escortPhone} onChange={e => set('escortPhone', e.target.value)} placeholder="+251…" />
          </Field>
        </div>
      </Section>

      {error && <div style={s.errorBox}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingBottom: 32 }}>
        <button style={s.btn} onClick={() => navigate(`/patient/${patientID}`)}>Cancel</button>
        <button style={s.btnPrimary} onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Publishing…' : '📨 Publish'}
        </button>
      </div>
    </Layout>
  )
}

// ── Shared sub-components ──────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eaeeec', borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children, full }) {
  return (
    <div style={{ marginBottom: 10, ...(full ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={{ display: 'block', fontSize: 12, color: '#6b6b6b', marginBottom: 5, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function ReadInput({ value, mono }) {
  return (
    <input readOnly value={value || '—'}
      style={{ background: '#F5F7F6', color: '#5a5a5a', border: '1px solid #eaeeec', ...(mono ? { fontFamily: 'monospace', fontSize: 12 } : {}) }} />
  )
}

const s = {
  topRow:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  h2:          { fontSize: 18, fontWeight: 600, marginBottom: 4 },
  sub:         { fontSize: 13, color: '#6b6b6b' },
  errorBox:    { background: '#FCEBEB', border: '1px solid #f7c1c1', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#a32d2d', marginBottom: 14 },
  btn:         { padding: '8px 18px', border: '1px solid #e8e8e8', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' },
  btnPrimary:  { padding: '8px 18px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #1D9E75, #0a5c47)', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  successBox:  { background: '#fff', border: '1px solid #eaeeec', borderRadius: 14, padding: '48px 32px', textAlign: 'center', maxWidth: 460, margin: '40px auto' },
  successIcon: { fontSize: 40, color: '#1D9E75', marginBottom: 14 },
  successTitle:{ fontSize: 18, fontWeight: 600, marginBottom: 10 },
  successBody: { fontSize: 13, color: '#6b6b6b', lineHeight: 1.6 },
}