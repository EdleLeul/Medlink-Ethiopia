import axios from 'axios'
import { auth } from '../config/firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
})

// Attach Firebase ID token to every request — force refresh to avoid expiry
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken(true) // true = force refresh
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auth ──────────────────────────────────────────────
export const registerProvider = (data) =>
  api.post('/providers/register', data)

// ── Patient search ────────────────────────────────────
// Backend needs a GET /patients/search?q=<term>&field=<all|id|fan|name>
// If this endpoint doesn't exist yet in your backend, add it to routes/patients.js:
//
//   router.get('/search', verifyToken, async (req, res) => {
//     const { q, field } = req.query
//     if (!q || q.trim().length < 2) return res.json({ results: [] })
//     const snap = await db.collection('patients').get()
//     const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
//     const term = q.trim().toLowerCase()
//     const results = all.filter(p => {
//       if (field === 'id')  return p.patientID?.toLowerCase().includes(term)
//       if (field === 'fan') return p.fanNumber?.includes(term)
//       if (field === 'name') return (p.firstName + ' ' + p.fatherName).toLowerCase().includes(term)
//       return (
//         p.patientID?.toLowerCase().includes(term) ||
//         p.fanNumber?.includes(term) ||
//         (p.firstName + ' ' + p.fatherName).toLowerCase().includes(term)
//       )
//     })
//     // Never return full patient objects — only enough to identify
//     res.json({ count: results.length, results: results.map(p => ({
//       patientID: p.patientID,
//       firstName: p.firstName,
//       fatherName: p.fatherName,
//       dateOfBirth: p.dateOfBirth,
//       sex: p.sex,
//       region: p.region,
//     }))})
//   })

export const searchPatients = (q, field = 'all') =>
  api.get('/patients/search', { params: { q, field } })

export const getPatient = (patientID) =>
  api.get(`/patients/${patientID}`)

// ── OTP ───────────────────────────────────────────────
export const requestOTP = (patientID, providerName, facilityName) =>
  api.post('/otp/request', { patientID, providerName, facilityName })

export const verifyOTP = (otpDocID, code, patientID) =>
  api.post('/otp/verify', { otpDocID, code, patientID })

export const pollOTPStatus = (otpDocID) =>
  api.get('/otp/status', { params: { otpDocID } })

// ── Records ───────────────────────────────────────────
const RECORD_TYPES = [
  'consultations','diagnoses','medications','labResults',
  'radiology','allergies','vaccinations','vitals',
  'surgicalHistory','familyHistory','referrals','doctorNotes',
]

export const getRecords = (patientID, type) => {
  if (!RECORD_TYPES.includes(type)) throw new Error(`Invalid record type: ${type}`)
  return api.get(`/records/${patientID}/${type}`)
}

export const uploadRecord = (patientID, type, data) => {
  if (!RECORD_TYPES.includes(type)) throw new Error(`Invalid record type: ${type}`)
  return api.post(`/records/${patientID}/${type}`, data)
}

// ── Referral ──────────────────────────────────────────
export const publishReferral = (patientID, referralData) =>
  api.post(`/records/${patientID}/referrals`, referralData)

// ── Audit log ─────────────────────────────────────────
export const getAuditLog = (patientID) =>
  api.get(`/patients/${patientID}/auditlog`)

// ── Break glass ───────────────────────────────────────
// This requires a new backend endpoint. Add to routes/patients.js:
//
//   router.post('/breakglass', verifyToken, async (req, res) => {
//     const { patientID, justification, providerUID, providerName, facilityName } = req.body
//     if (!justification || justification.trim().length < 20)
//       return res.status(400).json({ error: 'Justification too short' })
//     // Log the emergency access event
//     await db.collection('auditLogs').add({
//       patientID, providerUID, providerName, facilityName,
//       accessType: 'BREAK_GLASS',
//       justification,
//       timestamp: admin.firestore.FieldValue.serverTimestamp(),
//     })
//     // Create a 2-hour session
//     const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
//     await db.collection('providerSessions').add({
//       patientID, providerUID, facilityName,
//       accessType: 'BREAK_GLASS',
//       expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     })
//     // SMS alert to patient
//     await smsService.sendSMS(patientPhone,
//       `MEDLINK ALERT: Emergency access to your record was granted to ${providerName} at ${facilityName}. Ref: BREAK_GLASS. If unexpected, contact MedLink support.`)
//     res.json({ success: true, expiresAt })
//   })

export const requestBreakGlass = (patientID, justification) =>
  api.post('/patients/breakglass', { patientID, justification })

export default api