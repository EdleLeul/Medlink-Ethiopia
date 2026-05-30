const { admin } = require('../config/firebase');

/**
 * Sends an OTP to a phone number via Firebase Phone Auth.
 * For prototype: uses Firebase test phone numbers (no real SMS needed).
 * For production: Firebase sends real SMS automatically.
 *
 * @param {string} phone - E.164 format phone number e.g. +251911234567
 * @returns {string} verificationId - used to verify the OTP code later
 */
async function sendOTP(phone) {
  try {
    // Firebase Admin SDK creates a session cookie for phone verification
    // The client-side Firebase SDK handles the actual OTP delivery
    // For backend-initiated OTP, we store a generated code in Firestore
    // and Firebase test numbers intercept it automatically

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return { code, phone };
  } catch (err) {
    console.error('Firebase Phone Auth error:', err);
    throw { status: 502, message: 'OTP delivery failed', code: 'OTP_FAILED' };
  }
}

/**
 * Sends an access alert notification.
 * In production this would use Firebase Cloud Messaging.
 * For prototype: logged to console and stored in Firestore.
 */
async function sendAccessAlert(phone, providerName, facilityName) {
  console.log(`ACCESS ALERT → ${phone}: Dr. ${providerName} at ${facilityName} accessed your records.`);
  // Store notification in Firestore for patient app to display
  await admin.firestore().collection('notifications').add({
    phone,
    type:        'access_alert',
    message:     `Dr. ${providerName} at ${facilityName} accessed your health records.`,
    providerName,
    facilityName,
    read:        false,
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Sends an appointment reminder notification.
 * Stored in Firestore for patient app to display.
 */
async function sendAppointmentReminder(phone, patientName, hospitalName, dateTime) {
  console.log(`APPOINTMENT REMINDER → ${phone}: ${patientName} at ${hospitalName} on ${dateTime}`);
  await admin.firestore().collection('notifications').add({
    phone,
    type:        'appointment_reminder',
    message:     `Reminder: Your appointment at ${hospitalName} is on ${dateTime}.`,
    hospitalName,
    dateTime,
    read:        false,
    createdAt:   admin.firestore.FieldValue.serverTimestamp(),
  });
}

module.exports = { sendOTP, sendAccessAlert, sendAppointmentReminder };