// ─── appointments.js ─────────────────────────────────────────────────────────
const router = require('express').Router();
const { collections, admin } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { sendAppointmentReminder } = require('../services/smsService');

/**
 * POST /api/appointments
 * Book an appointment.
 * Body: { patientID, hospitalID, hospitalName, dateTime, reason, isChildAccount }
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { patientID, hospitalID, hospitalName, dateTime, reason } = req.body;
    const uid = req.user.uid;

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientDoc.data();

    // Access check: must be owner or parent
    if (patient.firebaseUID !== uid && patient.parentUID !== uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const appt = {
      patientID,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalID,
      hospitalName,
      dateTime: new Date(dateTime),
      reason: reason || '',
      status: 'confirmed',
      bookedBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await collections.appointments.add(appt);

    // Send reminder SMS
    const formattedDate = new Date(dateTime).toLocaleString('en-ET', {
      dateStyle: 'full', timeStyle: 'short'
    });
    await sendAppointmentReminder(patient.phone, patient.firstName, hospitalName, formattedDate);

    res.status(201).json({ id: ref.id, message: 'Appointment booked' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/appointments/:patientID
 * Get all appointments for a patient (upcoming + past).
 */
router.get('/:patientID', verifyToken, async (req, res, next) => {
  try {
    const { patientID } = req.params;
    const uid = req.user.uid;

    const patientDoc = await collections.patients.doc(patientID).get();
    if (!patientDoc.exists) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientDoc.data();
    if (patient.firebaseUID !== uid && patient.parentUID !== uid) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const snap = await collections.appointments
      .where('patientID', '==', patientID)
      .orderBy('dateTime', 'desc').get();

    const appointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/appointments/:apptID/cancel
 * Cancel an appointment.
 */
router.patch('/:apptID/cancel', verifyToken, async (req, res, next) => {
  try {
    const docRef = collections.appointments.doc(req.params.apptID);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Appointment not found' });

    await docRef.update({
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;