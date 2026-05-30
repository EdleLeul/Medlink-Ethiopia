const router  = require('express').Router();
const crypto  = require('crypto');
const { db, collections, admin } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const DURATION_OPTIONS = {
  '48h':  48 * 60 * 60 * 1000,
  '7d':    7 * 24 * 60 * 60 * 1000,
  '30d':  30 * 24 * 60 * 60 * 1000,
};

// Clinical fields included in the travel share (summary only, not full EMR)
const TRAVEL_RECORD_TYPES = [
  'allergies',
  'medications',
  'diagnoses',
  'vaccinations',
];

/**
 * POST /api/share/create
 * Patient creates a time-limited share token for their records.
 * Body: { patientID, duration: '48h' | '7d' | '30d' }
 */
router.post('/create', verifyToken, async (req, res, next) => {
  try {
    if (!req.body) {
  return res.status(400).json({ error: 'Request body is missing' });
}
    const { patientID, duration } = req.body;
    const uid = req.user.uid;

    if (!DURATION_OPTIONS[duration]) {
      return res.status(400).json({ error: 'Duration must be 48h, 7d, or 30d' });
    }

    // Verify ownership
    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });

    const patient = patientDoc.data();
    const isOwner  = patient.firebaseUID === uid;
    const isParent = patient.parentUID   === uid;
    if (!isOwner && !isParent) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    // Generate cryptographically secure 32-character token
    const token    = crypto.randomBytes(24).toString('base64url'); // 32 chars URL-safe
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + DURATION_OPTIONS[duration])
    );

    const passData = {
      token,
      patientID,
      duration,
      expiresAt,
      revoked:   false,
      viewCount: 0,
      createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection('sharePasses').add(passData);

    res.status(201).json({
      passID:    ref.id,
      token,
      expiresAt: expiresAt.toDate(),
      shareURL:  `${process.env.PUBLIC_URL || 'http://localhost:5173'}/share/${token}`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/list/:patientID
 * Returns all active (non-revoked, non-expired) share tokens for a patient.
 */
router.get('/list/:patientID', verifyToken, async (req, res, next) => {
  try {
    const { patientID } = req.params;
    const uid = req.user.uid;

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientDoc.data();
    if (patient.firebaseUID !== uid && patient.parentUID !== uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const snap = await db.collection('sharePasses')
      .where('patientID', '==', patientID)
      .where('revoked',   '==', false)
      .where('expiresAt', '>',  admin.firestore.Timestamp.now())
      .orderBy('expiresAt', 'desc')
      .get();

    const passes = snap.docs.map(d => ({
      passID:    d.id,
      token:     d.data().token,
      duration:  d.data().duration,
      expiresAt: d.data().expiresAt.toDate(),
      viewCount: d.data().viewCount,
      shareURL:  `${process.env.PUBLIC_URL || 'http://localhost:5173'}/share/${d.data().token}`,
    }));

    res.json({ passes });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/share/revoke/:passID
 * Patient immediately revokes a share token.
 */
router.delete('/revoke/:passID', verifyToken, async (req, res, next) => {
  try {
    const uid     = req.user.uid;
    const docRef  = db.collection('sharePasses').doc(req.params.passID);
    const doc     = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Share pass not found' });

    const { patientID } = doc.data();
    const patientDoc    = await collections.patients.doc(patientID).get();
    const patient       = patientDoc.data();

    if (patient.firebaseUID !== uid && patient.parentUID !== uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    await docRef.update({
      revoked:   true,
      revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: 'Share token revoked immediately' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/share/view/:token
 * PUBLIC endpoint — no Firebase auth required.
 * Foreign hospital opens this URL to view patient summary.
 * Returns clinical summary only (allergies, medications, diagnoses, vaccinations).
 */
router.get('/view/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find the share pass
    const snap = await db.collection('sharePasses')
      .where('token',   '==', token)
      .where('revoked', '==', false)
      .limit(1).get();

    if (snap.empty) {
      return res.status(404).json({ error: 'Share link not found or has been revoked' });
    }

    const pass    = snap.docs[0];
    const passData = pass.data();

    if (passData.expiresAt.toDate() < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Increment view count
    await pass.ref.update({
      viewCount: admin.firestore.FieldValue.increment(1),
      lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log access to audit log
    await collections.auditLogs.add({
      patientID:   passData.patientID,
      accessorUID: `share_token_${token.slice(0, 8)}`,
      action:      'SHARE_VIEW',
      role:        'public_share',
      recordType:  'travel_summary',
      timestamp:   admin.firestore.FieldValue.serverTimestamp(),
    });

    // Fetch patient profile
    const patientDoc = await collections.patients.doc(passData.patientID).get();
    const patient    = patientDoc.data();

    // Fetch clinical summary records
    const records = {};
    await Promise.all(
      TRAVEL_RECORD_TYPES.map(async (type) => {
        const rSnap = await collections.patients
          .doc(passData.patientID)
          .collection(type)
          .orderBy('createdAt', 'desc')
          .get();
        records[type] = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      })
    );

    // Return safe patient summary (no firebaseUID, no FAN)
    const { firebaseUID, fanNumber, parentUID, ...safePatient } = patient;

    res.json({
      patient:    safePatient,
      records,
      expiresAt:  passData.expiresAt.toDate(),
      viewCount:  passData.viewCount + 1,
      disclaimer: 'This is a read-only health summary shared by the patient via MedLink Ethiopia. Verify authenticity at medlink.et using the Patient ID.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;