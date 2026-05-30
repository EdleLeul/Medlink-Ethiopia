
// ═══════════════════════════════════════════════════════════════════════════════
// screens/dashboard/HomeScreen.js
// ═══════════════════════════════════════════════════════════════════════════════

import { OfflineBanner } from '../../components/OfflineBanner';
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { PatientIDCard } from '../../components/PatientIDCard';
import { AccountSwitcher } from '../../components/AccountSwitcher';
import { getPendingOTPs, denyOTP, getChildren } from '../../services/api';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { Platform } from 'react-native';

// At the top of the component add:
const isWeb = Platform.OS === 'web';

const TEAL = '#0B6E6E';

const QUICK_LINKS = [
  { label: 'Consultations',   icon: 'chatbubble-outline',      screen: 'Consultations' },
  { label: 'Diagnoses',       icon: 'medkit-outline',          screen: 'Diagnosis' },
  { label: 'Medications',     icon: 'fitness-outline',         screen: 'Medications' },
  { label: 'Lab Results',     icon: 'flask-outline',           screen: 'LabResults' },
  { label: 'Allergies',       icon: 'warning-outline',         screen: 'Allergies' },
  { label: 'Vaccinations',    icon: 'shield-checkmark-outline',screen: 'Vaccinations' },
  { label: 'Vitals',          icon: 'heart-outline',           screen: 'Vitals' },
  { label: 'Doctor Notes',    icon: 'document-text-outline',   screen: 'DoctorNotes' },
];

export default function HomeScreen({ navigation }) {
  const { activeProfile, setChildren } = useAuthStore();
  const [pendingOTPs, setPendingOTPs]  = useState([]);
  const [refreshing, setRefreshing]    = useState(false);

  async function load() {
    try {
      const [otpRes, childRes] = await Promise.all([getPendingOTPs(), getChildren()]);
      setPendingOTPs(otpRes.data.requests || []);
      setChildren(childRes.data.children  || []);
    } catch (e) {
  console.warn('Home load error:', e.message);
  Alert.alert('Load Error', e.message);
}
  }

  useEffect(() => { load(); }, []);

  async function handleDeny(otpDocID) {
    try {
      await denyOTP(otpDocID);
      setPendingOTPs(p => p.filter(o => o.otpDocID !== otpDocID));
      Alert.alert('Access Denied', 'The provider has been denied access.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isWeb ? '#F0F4F8' : '#F9FAFB' }}>
      <OfflineBanner />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={isWeb ? { maxWidth: 800, alignSelf: 'center', width: '100%', padding: 24 } : {}}>
          {/* Header */}
          <View style={s.topBar}>
            <Text style={s.greeting}>Hello, {activeProfile?.firstName} {activeProfile?.fatherName || activeProfile?.lastName || ''} 👋</Text>
            <TouchableOpacity onPress={() => signOut(auth)}>
              <Ionicons name="log-out-outline" size={24} color={TEAL} />
            </TouchableOpacity>
          </View>

          {/* Account switcher (shown only if children exist) */}
          <AccountSwitcher />

          {/* Patient ID Card */}
          <PatientIDCard profile={activeProfile} />

          {/* Pending OTP Requests */}
          {pendingOTPs.map(req => (
  <View key={req.otpDocID} style={s.otpCard}>
    {/* X dismiss button */}
    <TouchableOpacity
      style={s.otpDismiss}
      onPress={() => setPendingOTPs(p => p.filter(o => o.otpDocID !== req.otpDocID))}>
      <Ionicons name="close" size={16} color="#92400E" />
    </TouchableOpacity>

    <View style={s.otpInfo}>
      <Text style={s.otpDoctor}>Dr. {req.providerName}</Text>
      <Text style={s.otpFacility}>{req.facilityName}</Text>
      <Text style={s.otpExpiry}>
        Expires: {new Date(req.expiresAt).toLocaleTimeString()}
      </Text>
    </View>
    <View style={s.otpActions}>
      <TouchableOpacity
        style={s.allowBtn}
        onPress={() => navigation.navigate('OTPApproval', { request: req })}>
        <Text style={s.allowText}>Allow</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.denyBtn} onPress={() => handleDeny(req.otpDocID)}>
        <Text style={s.denyText}>Deny</Text>
      </TouchableOpacity>
    </View>
  </View>
))}

          {/* Quick Access Grid */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Health Records</Text>
            <View style={s.grid}>
              {QUICK_LINKS.map(item => (
                <TouchableOpacity
                  key={item.screen}
                  style={s.gridItem}
                  onPress={() => navigation.navigate('Records', { screen: item.screen })}
                >
                  <Ionicons name={item.icon} size={26} color={TEAL} />
                  <Text style={s.gridLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  greeting:     { fontSize: 18, fontWeight: '700', color: '#111827' },
  section:      { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  otpCard:      { backgroundColor: '#FFF3CD', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#FBBF24' },
  otpInfo:      { flex: 1 },
  otpDoctor:    { fontWeight: '700', fontSize: 14, color: '#111827' },
  otpFacility:  { fontSize: 13, color: '#6B7280' },
  otpExpiry:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  otpActions:   { gap: 6 },
  otpDismiss: { position: 'absolute', top: 8, right: 8, padding: 4 },
  allowBtn:     { backgroundColor: TEAL, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  allowText:    { color: '#fff', fontWeight: '700', fontSize: 13 },
  denyBtn:      { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  denyText:     { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem:     { width: '46%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  gridLabel:    { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});