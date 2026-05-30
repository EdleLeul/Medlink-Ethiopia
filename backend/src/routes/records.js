const router = require('express').Router();
const { db, collections, admin } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { logAccess } = require('../services/auditService');

/**
 * All clinical records are stored as subcollections under:
 * patients/{patientID}/{recordType}/{docID}
 *
 * Supported recordTypes (mirrors FHIR resource names):
 *   consultations    → Encounter
 *   diagnoses        → Condition
 *   medications      → MedicationRequest
 *   labResults       → DiagnosticReport / Observation
 *   radiology        → ImagingStudy
 *   allergies        → AllergyIntolerance
 *   vaccinations     → Immunization
 *   vitals           → Observation (vital signs)
 *   surgicalHistory  → Procedure
 *   familyHistory    → FamilyMemberHistory
 *   referrals        → ServiceRequest
 *   doctorNotes      → DocumentReference
 */

const VALID_TYPES = [
  'consultations', 'diagnoses', 'medications', 'labResults',
  'radiology', 'allergies', 'vaccinations', 'vitals',
  'surgicalHistory', 'familyHistory', 'referrals', 'doctorNotes'
];

// Middleware: validate record type
function validateType(req, res, next) {
  if (!VALID_TYPES.includes(req.params.type)) {
    return res.status(400).json({ error: `Invalid record type: ${req.params.type}` });
  }
  next();
}

/**
 * GET /api/records/:patientID/:type
 * Retrieves all records of a given type for a patient.
 * Requires: valid Firebase token (provider or patient themselves)
 * Provider access additionally requires a valid, unexpired session token
 * set after OTP verification (stored in Firestore providerSessions collection).
 */
router.get('/:patientID/:type', verifyToken, validateType, async (req, res, next) => {
  try {
    const { patientID, type } = req.params;
    const uid = req.user.uid;

    // Determine if caller is the patient, a parent, or a provider
    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });

    const patient = patientDoc.data();
    const isOwner  = patient.firebaseUID === uid;
    const isParent = patient.parentUID   === uid;

    if (!isOwner && !isParent) {
      // Must be a provider with an active OTP session
      const session = await db.collection('providerSessions')
        .where('providerUID', '==', uid)
        .where('patientID',   '==', patientID)
        .where('expiresAt',   '>',  admin.firestore.Timestamp.now())
        .limit(1).get();

      if (session.empty) {
        return res.status(403).json({ error: 'No active access session. OTP required.', code: 'SESSION_REQUIRED' });
      }

      await logAccess({ patientID, accessorUID: uid, type, action: 'READ', role: 'provider' });
    }

    const snapshot = await collections.patients.doc(patientID)
      .collection(type).orderBy('createdAt', 'desc').get();

    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/records/:patientID/:type
 * Adds a new clinical record. Providers only.
 * Body shape varies by type — all stored as-is with server timestamp.
 */
router.post('/:patientID/:type', verifyToken, validateType, async (req, res, next) => {
  try {
    const { patientID, type } = req.params;
    const uid = req.user.uid;

    // Verify provider has active session
    const session = await db.collection('providerSessions')
      .where('providerUID', '==', uid)
      .where('patientID',   '==', patientID)
      .where('expiresAt',   '>',  admin.firestore.Timestamp.now())
      .limit(1).get();

    if (session.empty) {
      return res.status(403).json({ error: 'No active access session', code: 'SESSION_REQUIRED' });
    }

    const sessionData = session.docs[0].data();

    const record = {
      ...req.body,
      patientID,
      recordType:   type,
      providerUID:  uid,
      providerName: sessionData.providerName,
      facilityName: sessionData.facilityName,
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await collections.patients.doc(patientID).collection(type).add(record);
    await logAccess({ patientID, accessorUID: uid, type, action: 'WRITE', role: 'provider' });

    res.status(201).json({ id: ref.id, message: 'Record saved' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/records/:patientID/:type/:recordID
 * Updates an existing record. Providers only.
 */
router.put('/:patientID/:type/:recordID', verifyToken, validateType, async (req, res, next) => {
  try {
    const { patientID, type, recordID } = req.params;
    const uid = req.user.uid;

    const session = await db.collection('providerSessions')
      .where('providerUID', '==', uid)
      .where('patientID',   '==', patientID)
      .where('expiresAt',   '>',  admin.firestore.Timestamp.now())
      .limit(1).get();

    if (session.empty) return res.status(403).json({ error: 'No active access session' });

    const ref = collections.patients.doc(patientID).collection(type).doc(recordID);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: 'Record not found' });

    await ref.update({ ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    res.json({ message: 'Record updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;