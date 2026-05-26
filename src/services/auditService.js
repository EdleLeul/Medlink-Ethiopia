const { collections, admin } = require('../config/firebase');

/**
 * Writes an immutable access log entry to Firestore.
 * @param {object} params
 * @param {string} params.patientID     - Patient whose record was accessed
 * @param {string} params.accessorUID   - Firebase UID of the accessor
 * @param {string} params.type          - Record type accessed (e.g. 'labResults')
 * @param {string} params.action        - 'READ' | 'WRITE'
 * @param {string} params.role          - 'provider' | 'patient' | 'parent'
 * @param {string} [params.facilityName]
 * @param {string} [params.providerName]
 */
async function logAccess({ patientID, accessorUID, type, action, role, facilityName, providerName }) {
  try {
    await collections.auditLogs.add({
      patientID,
      accessorUID,
      recordType:   type,
      action,
      role,
      facilityName: facilityName || null,
      providerName: providerName || null,
      timestamp:    admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Audit log failure should never crash the main request
    console.error('Audit log write failed:', err);
  }
}

/**
 * Retrieves access log for a patient (for patient-facing access log screen).
 * @param {string} patientID
 * @param {number} limit
 */
async function getAccessLog(patientID, limit = 50) {
  const snap = await collections.auditLogs
    .where('patientID', '==', patientID)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

module.exports = { logAccess, getAccessLog };