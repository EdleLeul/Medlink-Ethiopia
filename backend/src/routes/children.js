const router = require('express').Router();
const { collections, admin } = require('../config/firebase');
const { generatePatientID } = require('../services/idGenerator');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/children/register
 * Parent registers a minor child under their account.
 * Body: { firstName, lastName, dateOfBirth, sex, bloodType, relationship }
 * Auth: Parent's Firebase token
 */
router.post('/register', verifyToken, async (req, res, next) => {
  try {
    const parentUID = req.user.uid;
    const { firstName, lastName, dateOfBirth, sex, bloodType, relationship } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !sex) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure parent is a registered patient
    const parentSnap = await collections.patients
      .where('firebaseUID', '==', parentUID).limit(1).get();
    if (parentSnap.empty) {
      return res.status(403).json({ error: 'Parent must be a registered MedLink patient' });
    }
    const parentData = parentSnap.docs[0].data();

    // Age validation — must be under 18
    const dob  = new Date(dateOfBirth);
    const age  = (Date.now() - dob) / (365.25 * 24 * 3600 * 1000);
    if (age >= 18) {
      return res.status(400).json({ error: 'Child must be under 18 years old' });
    }

    const patientID = await generatePatientID(true); // CML- prefix

    const childData = {
      patientID,
      firebaseUID: null,               // Children don't have their own login
      parentUID,
      parentPatientID: parentData.patientID,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      firstName,
      lastName,
      dateOfBirth,
      sex,
      bloodType: bloodType || null,
      relationship: relationship || 'parent',
      isChild: true,
      phone:   parentData.phone,       // OTPs go to parent's phone
      region:  parentData.region,
      city:    parentData.city,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await collections.patients.doc(patientID).set(childData);

    res.status(201).json({
      patientID,
      message: `Child account created for ${firstName} ${lastName}`
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/children
 * Returns all child accounts belonging to the authenticated parent.
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const parentUID = req.user.uid;
    const snap = await collections.patients
      .where('parentUID', '==', parentUID)
      .where('isChild',   '==', true)
      .get();

    const children = snap.docs.map(d => {
      const { firebaseUID, parentUID: _, ...safe } = d.data();
      return safe;
    });

    res.json({ children });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/children/:patientID
 * Gets a single child's profile. Parent access only.
 */
router.get('/:patientID', verifyToken, async (req, res, next) => {
  try {
    const doc = await collections.patients.doc(req.params.patientID).get();
    if (!doc.exists || !doc.data().isChild) {
      return res.status(404).json({ error: 'Child record not found' });
    }
    if (doc.data().parentUID !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }
    const { firebaseUID, parentUID, ...safe } = doc.data();
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/children/:patientID
 * Removes a child account. Parent only. Soft-deletes (marks inactive).
 */
router.delete('/:patientID', verifyToken, async (req, res, next) => {
  try {
    const docRef = collections.patients.doc(req.params.patientID);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().parentUID !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }
    await docRef.update({
      active: false,
      deletedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Child account removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;