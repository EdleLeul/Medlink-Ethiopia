import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Hardcoded for debugging — move back to .env after confirming it works
const firebaseConfig = {
  apiKey:            "AIzaSyCfAA-P6p9Wx89FhU36E-zwsx7r261AhRA",
  authDomain:        "medlink-ethiopia-5f119.firebaseapp.com",
  projectId:         "medlink-ethiopia-5f119",
  storageBucket:     "medlink-ethiopia-5f119.firebasestorage.app",
  messagingSenderId: "525431849256",
  appId:             "1:525431849256:web:764e953a6547ad98d7d01d"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db   = getFirestore(app)
export default app