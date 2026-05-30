import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './config/firebase'
import { getDoc, doc } from 'firebase/firestore'
import { db } from './config/firebase'
import useAuthStore from './store/authStore'

import ProtectedRoute from './components/ProtectedRoute'
import LoginScreen from './screens/auth/LoginScreen'
import SearchScreen from './screens/search/SearchScreen'
import PatientProfile from './screens/patient/PatientProfile'
import ReferralScreen from './screens/referral/ReferralScreen'
import UploadScreen from './screens/upload/UploadScreen'
import AuditLogScreen from './screens/auditlog/AuditLogScreen'
import DashboardScreen from './screens/dashboard/DashboardScreen'

export default function App() {
  const { setProvider, clearProvider, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Fetch provider profile from Firestore
          const snap = await getDoc(doc(db, 'providers', user.uid))
          if (snap.exists()) {
            setProvider({ uid: user.uid, email: user.email, ...snap.data() })
          } else {
            // Authenticated but no provider profile yet
            clearProvider()
          }
        } catch {
          clearProvider()
        }
      } else {
        clearProvider()
      }
    })
    return unsub
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/patient/:patientID" element={<PatientProfile />} />
          <Route path="/patient/:patientID/referral" element={<ReferralScreen />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/auditlog" element={<AuditLogScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>
    </BrowserRouter>
  )
}