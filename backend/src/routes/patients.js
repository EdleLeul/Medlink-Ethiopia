const router = require('express').Router();
const { collections, admin, db } = require('../config/firebase');
const { generatePatientID } = require('../services/idGenerator');
const { verifyToken } = require('../middleware/auth');
const { getAccessLog } = require('../services/auditService');
const { sendAccessAlert } = require('../services/smsService')

/**
 * GET /api/patients/me
 * Resolves the logged-in patient's profile from their Firebase token.
 * Must be defined BEFORE /:patientID to avoid route conflict.
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const snap = await collections.patients
      .where('firebaseUID', '==', req.user.uid).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Not registered' });
    const { firebaseUID, ...safe } = snap.docs[0].data();
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/search?q=<term>&field=<all|id|fan|name>
 * Used by the provider PWA search screen.
 * Returns minimal patient info only — never full records.
 * Multiple name matches return count only to protect privacy.
 * Must be BEFORE /:patientID to avoid route conflict.
 */
router.get('/search', verifyToken, async (req, res, next) => {
  const { q, field } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters.' });
  }
  try {
    const term = q.trim().toLowerCase();
    const snap = await collections.patients.get();
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => !p.isChild);

    const matches = all.filter(p => {
      const fullName = `${p.firstName || ''} ${p.fatherName || ''} ${p.grandfatherName || ''}`.toLowerCase();
      const patientID = (p.patientID || '').toLowerCase();
      const fan = (p.fanNumber || '').replace(/\s/g, '');
      if (field === 'id')   return patientID.includes(term);
      if (field === 'fan')  return fan.includes(term.replace(/\s/g, ''));
      if (field === 'name') return fullName.includes(term);
      return patientID.includes(term) || fan.includes(term) || fullName.includes(term);
    });

    const safeResults = matches.map(p => ({
      patientID:   p.patientID,
      firstName:   p.firstName,
      fatherName:  p.fatherName,
      dateOfBirth: p.dateOfBirth,
      sex:         p.sex,
      region:      p.region,
    }));

    return res.json({ count: safeResults.length, results: safeResults });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patients/breakglass
 * Grants immediate emergency access without OTP.
 * Logs the event permanently and sends SMS alert to patient.
 * Must be BEFORE /:patientID to avoid route conflict.
 */
router.post('/breakglass', verifyToken, async (req, res, next) => {
  const { patientID, justification } = req.body;
  const providerUID = req.user.uid;

  if (!patientID || !justification || justification.trim().length < 30) {
    return res.status(400).json({
      error: 'Patient ID and a justification of at least 30 characters are required.',
    });
  }

  try {
    const providerSnap = await db.collection('providers').doc(providerUID).get();
    if (!providerSnap.exists) {
      return res.status(403).json({ error: 'Provider profile not found.' });
    }
    const provider = providerSnap.data();

    const patientSnap = await collections.patients
      .where('patientID', '==', patientID).limit(1).get();
    if (patientSnap.empty) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patient = patientSnap.docs[0].data();

    // Immutable audit log entry
    await db.collection('auditLogs').add({
      patientID,
      providerUID,
      providerName:  provider.providerName,
      facilityName:  provider.facilityName,
      accessType:    'BREAK_GLASS',
      justification: justification.trim(),
      timestamp:     admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2-hour session
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db.collection('providerSessions').add({
      patientID,
      providerUID,
      facilityName: provider.facilityName,
      accessType:   'BREAK_GLASS',
      expiresAt:    admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt:    admin.firestore.FieldValue.serverTimestamp(),
    });

    // SMS alert to patient
    if (patient.phone) {
      
await sendAccessAlert(
  patient.phone, provider.providerName, provider.facilityName
);
    }

    return res.json({ success: true, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/:patientID/auditlog
 * Returns access log for a patient.
 * Must be BEFORE /:patientID to avoid route conflict.
 */
router.get('/:patientID/auditlog', verifyToken, async (req, res, next) => {
  try {
    const logs = await getAccessLog(req.params.patientID);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/patients/:patientID
 * Retrieves a patient's basic profile.
 */
router.get('/:patientID', verifyToken, async (req, res, next) => {
  try {
    const doc = await collections.patients.doc(req.params.patientID).get();
    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });
    const { firebaseUID, ...safeData } = doc.data();
    res.json(safeData);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/patients/register
 * Registers a new patient and assigns a unique MedLink ID.
 */
router.post('/register', async (req, res, next) => {
  try {
    const {
      firstName, lastName, dateOfBirth, sex,
      phone, region, city, bloodType, firebaseUID,
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !sex || !phone || !firebaseUID) {
      return res.status(400).json({ error: 'Missing required fields', code: 'VALIDATION_ERROR' });
    }

    const existing = await collections.patients
      .where('firebaseUID', '==', firebaseUID).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({
        error: 'Patient already registered',
        patientID: existing.docs[0].data().patientID,
      });
    }

    const patientID = await generatePatientID(false);

    const patientData = {
      patientID,
      firebaseUID,
      firstName,
      lastName,
      dateOfBirth,
      sex,
      phone,
      region:    region    || null,
      city:      city      || null,
      bloodType: bloodType || null,
      isChild:   false,
      parentUID: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await collections.patients.doc(patientID).set(patientData);
    res.status(201).json({ patientID, message: 'Registration successful' });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/patients/:patientID
 * Updates patient demographics.
 */
router.put('/:patientID', verifyToken, async (req, res, next) => {
  try {
    const docRef = collections.patients.doc(req.params.patientID);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Patient not found' });

    if (doc.data().firebaseUID !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const allowed = ['firstName', 'lastName', 'phone', 'region', 'city', 'bloodType'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await docRef.update(updates);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;