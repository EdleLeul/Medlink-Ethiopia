const { collections, admin } = require('../config/firebase');

const OTP_EXPIRY_MINUTES = 5;

function generateOTPCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates an OTP, stores it in Firestore, and stores it
 * in the patient's pending requests so the app can display it.
 *
 * For prototype demo: OTP code is visible in the patient app.
 * For production: OTP would be sent via Firebase Phone Auth SMS.
 */
async function createOTP(patientID, patientPhone, providerName, facilityName, providerUID) {
  const code = generateOTPCode();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  );

  const docRef = await collections.otps.add({
    patientID,
    patientPhone,
    code,
    providerUID,
    providerName,
    facilityName,
    expiresAt,
    used:      false,
    denied:    false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`OTP for patient ${patientID}: ${code} (expires in ${OTP_EXPIRY_MINUTES} min)`);

  return docRef.id;
}

/**
 * Verifies an OTP code submitted by the provider.
 */
async function verifyOTP(otpDocID, submittedCode, patientID) {
  const docRef = collections.otps.doc(otpDocID);
  const doc    = await docRef.get();

  if (!doc.exists) throw { status: 404, message: 'OTP not found',          code: 'OTP_NOT_FOUND' };

  const data = doc.data();
  const now  = new Date();

  if (data.used)                          throw { status: 400, message: 'OTP already used',       code: 'OTP_USED'    };
  if (data.denied)                        throw { status: 403, message: 'Access denied by patient',code: 'OTP_DENIED'  };
  if (data.patientID !== patientID)       throw { status: 403, message: 'OTP mismatch',            code: 'OTP_MISMATCH'};
  if (data.expiresAt.toDate() < now)      throw { status: 400, message: 'OTP expired',             code: 'OTP_EXPIRED' };
  if (data.code !== submittedCode)        throw { status: 401, message: 'Invalid OTP code',        code: 'OTP_INVALID' };

  // Mark as used — single use enforcement
  await docRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

  return { valid: true, providerName: data.providerName, facilityName: data.facilityName };
}

/**
 * Patient explicitly denies an access request.
 */
async function denyOTP(otpDocID, patientID) {
  const docRef = collections.otps.doc(otpDocID);
  const doc    = await docRef.get();
  if (!doc.exists || doc.data().patientID !== patientID) {
    throw { status: 403, message: 'Unauthorised', code: 'FORBIDDEN' };
  }
  await docRef.update({ denied: true, deniedAt: admin.firestore.FieldValue.serverTimestamp() });
}

module.exports = { createOTP, verifyOTP, denyOTP };