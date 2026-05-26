const { collections } = require('../config/firebase');

/**
 * Generates a unique MedLink Patient ID.
 * Format: ML-YYYYMMDD-XXXXXX
 * Example: ML-20260524-A3F9K2
 *
 * - ML   : MedLink prefix
 * - DATE : Registration date (YYYYMMDD)
 * - 6    : Base-36 random alphanumeric suffix (uppercase)
 *
 * Collision checked against Firestore before returning.
 */

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous: 0,O,1,I

function randomSuffix(len = 6) {
  let result = '';
  for (let i = 0; i < len; i++) {
    result += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return result;
}

function dateStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Generates a collision-free patient ID.
 * Retries up to 5 times before throwing.
 * Child accounts get prefix CML- instead of ML-.
 */
async function generatePatientID(isChild = false) {
  const prefix = isChild ? 'CML' : 'ML';
  const stamp = dateStamp();
  let attempts = 0;

  while (attempts < 5) {
    const id = `${prefix}-${stamp}-${randomSuffix()}`;
    const existing = await collections.patients.where('patientID', '==', id).limit(1).get();
    if (existing.empty) return id;
    attempts++;
  }

  throw new Error('Failed to generate unique patient ID after 5 attempts');
}

module.exports = { generatePatientID };