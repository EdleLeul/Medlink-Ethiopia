const { collections, admin } = require('../config/firebase');
const { sendSMS } = require('./smsService');

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

function generateOTPCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates an OTP, stores it in Firestore, and sends it via SMS.
 * @param {string} patientID - The patient whose record is being requested
 * @param {string} patientPhone - Phone number to send OTP to
 * @param {string} providerName - Doctor name requesting access
 * @param {string} facilityName - Facility the provider is at
 * @returns {string} otpDocID - Used to verify later
 */
async function createOTP(patientID, patientPhone, providerName, facilityName) {
  const code = generateOTPCode();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  );

  const docRef = await collections.otps.add({
    patientID,
    code,
    providerName,
    facilityName,
    expiresAt,
    used: false,
    denied: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const message =
    `MedLink Access Request:\n` +
    `Dr. ${providerName} at ${facilityName} is requesting access to your health records.\n` +
    `Your OTP is: ${code}\n` +
    `Valid for ${OTP_EXPIRY_MINUTES} minutes. If this was not you, ignore this message.`;

  await sendSMS(patientPhone, message);

  return docRef.id;
}

/**
 * Verifies an OTP code.
 * Enforces: not expired, not used, not denied, correct code.
 */
async function verifyOTP(otpDocID, submittedCode, patientID) {
  const docRef = collections.otps.doc(otpDocID);
  const doc = await docRef.get();

  if (!doc.exists) throw { status: 404, message: 'OTP not found', code: 'OTP_NOT_FOUND' };

  const data = doc.data();
  const now = new Date();

  if (data.used)    throw { status: 400, message: 'OTP already used',    code: 'OTP_USED' };
  if (data.denied)  throw { status: 403, message: 'Access denied by patient', code: 'OTP_DENIED' };
  if (data.patientID !== patientID) throw { status: 403, message: 'OTP mismatch', code: 'OTP_MISMATCH' };
  if (data.expiresAt.toDate() < now) throw { status: 400, message: 'OTP expired', code: 'OTP_EXPIRED' };
  if (data.code !== submittedCode)   throw { status: 401, message: 'Invalid OTP code', code: 'OTP_INVALID' };

  // Mark as used (single-use enforcement)
  await docRef.update({ used: true, usedAt: admin.firestore.FieldValue.serverTimestamp() });

  return { valid: true, providerName: data.providerName, facilityName: data.facilityName };
}

/**
 * Patient explicitly denies an access request from their app.
 */
async function denyOTP(otpDocID, patientID) {
  const docRef = collections.otps.doc(otpDocID);
  const doc = await docRef.get();
  if (!doc.exists || doc.data().patientID !== patientID) {
    throw { status: 403, message: 'Unauthorised', code: 'FORBIDDEN' };
  }
  await docRef.update({ denied: true });
}

module.exports = { createOTP, verifyOTP, denyOTP };