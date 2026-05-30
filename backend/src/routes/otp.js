const router = require('express').Router();
const { db, collections, admin } = require('../config/firebase');
const { verifyToken }            = require('../middleware/auth');
const { createOTP, verifyOTP, denyOTP } = require('../services/otpService');
const { sendAccessAlert }        = require('../services/smsService');

const SESSION_DURATION_MINUTES       = 60;
const BREAK_GLASS_DURATION_MINUTES   = 120;

/**
 * POST /api/otp/request
 * Provider requests access to a patient's record.
 * Stores OTP in Firestore — patient app polls and displays it.
 */
router.post('/request', verifyToken, async (req, res, next) => {
  try {
    
    const { patientID, providerName, facilityName } = req.body;
    const providerUID = req.user.uid;

    if (!patientID || !providerName || !facilityName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });

    const { phone } = patientDoc.data();

    // Check for existing active OTP for this patient from this provider
const existing = await collections.otps
  .where('patientID',   '==', patientID)
  .where('providerUID', '==', providerUID)
  .where('used',        '==', false)
  .where('denied',      '==', false)
  .where('expiresAt',   '>',  admin.firestore.Timestamp.now())
  .limit(1).get();

if (!existing.empty) {
  return res.json({ 
    otpDocID: existing.docs[0].id, 
    message:  'Active request already exists' 
  });
}
    const otpDocID = await createOTP(patientID, phone, providerName, facilityName, providerUID);

    res.json({ otpDocID, message: 'Access request sent to patient' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/otp/verify
 * Provider submits OTP code. Creates a timed session on success.
 */
router.post('/verify', verifyToken, async (req, res, next) => {
  try {
    const { otpDocID, code, patientID } = req.body;
    const providerUID = req.user.uid;

    const result = await verifyOTP(otpDocID, code, patientID);

    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)
    );

    await db.collection('providerSessions').add({
      providerUID,
      patientID,
      providerName:  result.providerName,
      facilityName:  result.facilityName,
      sessionType:   'standard',
      expiresAt,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    // Store access alert notification in Firestore for patient app
    await sendAccessAlert(
      (await collections.patients.doc(patientID).get()).data().phone,
      result.providerName,
      result.facilityName
    );

    res.json({ message: 'Access granted', sessionExpiresAt: expiresAt.toDate() });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

/**
 * POST /api/otp/deny
 * Patient explicitly denies an access request.
 */
router.post('/deny', verifyToken, async (req, res, next) => {
  try {
    const { otpDocID } = req.body;
    const uid = req.user.uid;

    const snap = await collections.patients
      .where('firebaseUID', '==', uid).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Patient not found' });

    const patientID = snap.docs[0].data().patientID;
    await denyOTP(otpDocID, patientID);

    res.json({ message: 'Access denied' });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

/**
 * GET /api/otp/pending
 * Patient polls for pending access requests.
 * Returns requests WITH the OTP code for prototype demo display.
 */
router.get('/pending', verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    const snap = await collections.patients
      .where('firebaseUID', '==', uid).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: 'Patient not found' });

    const patientID = snap.docs[0].data().patientID;

    const pending = await collections.otps
      .where('patientID', '==', patientID)
      .where('used',      '==', false)
      .where('denied',    '==', false)
      .where('expiresAt', '>',  admin.firestore.Timestamp.now())
      .orderBy('expiresAt', 'desc')
      .get();

    const requests = pending.docs.map(d => ({
      otpDocID:     d.id,
      providerName: d.data().providerName,
      facilityName: d.data().facilityName,
      expiresAt:    d.data().expiresAt.toDate(),
      // Include OTP code for prototype demo
      // REMOVE THIS IN PRODUCTION — code should only come via SMS
      otpCode:      d.data().code,
    }));

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/otp/breakglass
 * Emergency access — bypasses OTP, grants 2-hour session.
 * Logs permanently to audit log and sends alert notification.
 */
router.post('/breakglass', verifyToken, async (req, res, next) => {
  try {
    const { patientID, providerName, facilityName, justification } = req.body;
    const providerUID = req.user.uid;

    if (!justification || justification.trim().length < 30) {
      return res.status(400).json({
        error: 'Clinical justification must be at least 30 characters',
        code:  'JUSTIFICATION_TOO_SHORT'
      });
    }

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });

    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + BREAK_GLASS_DURATION_MINUTES * 60 * 1000)
    );

    // Create extended session
    await db.collection('providerSessions').add({
      providerUID,
      patientID,
      providerName,
      facilityName,
      sessionType:   'break_glass',
      justification: justification.trim(),
      expiresAt,
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    // Permanent audit log entry
    await collections.auditLogs.add({
      patientID,
      accessorUID:   providerUID,
      providerName,
      facilityName,
      action:        'BREAK_GLASS',
      justification: justification.trim(),
      role:          'provider',
      timestamp:     admin.firestore.FieldValue.serverTimestamp(),
    });

    // Alert notification stored in Firestore
    await sendAccessAlert(
      patientDoc.data().phone,
      `${providerName} (EMERGENCY ACCESS)`,
      facilityName
    );

    res.json({
      message:          'Emergency access granted',
      sessionExpiresAt: expiresAt.toDate(),
      warning:          'This access has been permanently logged and the patient has been notified.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;