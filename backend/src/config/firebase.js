const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Firestore collection references
const collections = {
  patients:     db.collection('patients'),
  providers:    db.collection('providers'),
  records:      db.collection('records'),        // EMR records (subcollections per patient)
  otps:         db.collection('otps'),
  appointments: db.collection('appointments'),
  hospitals:    db.collection('hospitals'),
  auditLogs:    db.collection('auditLogs'),
  children:     db.collection('children'),
};

module.exports = { admin, db, auth, collections };