const router = require('express').Router();
const { db, collections, admin } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { createOTP, verifyOTP, denyOTP } = require('../services/otpService');
const { sendAccessAlert } = require('../services/smsService');

const SESSION_DURATION_MINUTES = 60; // Provider session after OTP approval

/**
 * POST /api/otp/request
 * Provider requests access to a patient's record.
 * Sends OTP to patient's phone and returns otpDocID for polling.
 *
 * Body: { patientID, providerName, facilityName }
 * Auth: Provider Firebase token
 */
router.post('/request', verifyToken, async (req, res, next) => {
  try {
    const { patientID, providerName, facilityName } = req.body;
    if (!patientID || !providerName || !facilityName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });

    const { phone } = patientDoc.data();
    const otpDocID = await createOTP(patientID, phone, providerName, facilityName);

    res.json({ otpDocID, message: 'OTP sent to patient' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/otp/verify
 * Provider submits OTP code. If valid, creates a timed provider session.
 *
 * Body: { otpDocID, code, patientID }
 * Auth: Provider Firebase token
 */
router.post('/verify', verifyToken, async (req, res, next) => {
  try {
    const { otpDocID, code, patientID } = req.body;
    const providerUID = req.user.uid;

    const result = await verifyOTP(otpDocID, code, patientID);

    // Create provider session valid for SESSION_DURATION_MINUTES
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000)
    );

    await db.collection('providerSessions').add({
      providerUID,
      patientID,
      providerName: result.providerName,
      facilityName: result.facilityName,
      expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send post-access alert to patient
    const patientDoc = await collections.patients.doc(patientID).get();
    const { phone } = patientDoc.data();
    await sendAccessAlert(phone, result.providerName, result.facilityName);

    res.json({ message: 'Access granted', sessionExpiresAt: expiresAt.toDate() });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    next(err);
  }
});

/**
 * POST /api/otp/deny
 * Patient explicitly denies an access request.
 * Body: { otpDocID }
 * Auth: Patient Firebase token
 */
router.post('/deny', verifyToken, async (req, res, next) => {
  try {
    const { otpDocID } = req.body;
    const uid = req.user.uid;

    // Find patient by firebaseUID to get patientID
    const snap = await collections.patients.where('firebaseUID', '==', uid).limit(1).get();
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
 * Patient polls for pending access requests (for in-app approval UI).
 * Auth: Patient Firebase token
 */
router.get('/pending', verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const snap = await collections.patients.where('firebaseUID', '==', uid).limit(1).get();
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
    }));

    res.json({ requests });
  } catch (err) {
    next(err);
  }
});

module.exports = router;