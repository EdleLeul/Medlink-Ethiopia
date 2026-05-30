import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth }              from './src/firebaseConfig';
import AppNavigator          from './src/navigation/AppNavigator';
import { useAuthStore }      from './src/store/authStore';
import * as api              from './src/services/api';
import { preloadPatientData, clearAllCache } from './src/services/offlineCache';

export default function App() {
  const { setUser, setPatientProfile, setChildren, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
                try {
          // Force token refresh before API calls
          await firebaseUser.getIdToken(true);

          // Load profile and children
          const [profileRes, childrenRes] = await Promise.all([
            api.getPatient('me'),
            api.getChildren(),
          ]);

          const profile  = profileRes.data;
          const children = childrenRes.data.children || [];

          setPatientProfile(profile);
          setChildren(children);

          // Preload all patient data for offline use (fire and forget)
          // Don't await — let it run in background after app loads
          preloadPatientData(api, profile.patientID).catch(e =>
            console.warn('Background preload failed:', e.message)
          );

          // Also preload children's data
          children.forEach(child => {
            preloadPatientData(api, child.patientID).catch(() => {});
          });

        } catch (e) {
          console.warn('Profile load failed (may be offline):', e.message);
          // App will still load — cached data served by interceptor
        }
      } else {
        // On logout, clear all cached data
        await clearAllCache();
        logout();
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color="#0B6E6E" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AppNavigator />
    </>
  );
}