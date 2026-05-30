import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { denyOTP } from '../../services/api';

const TEAL = '#0B6E6E';

export default function OTPApprovalScreen({ route, navigation }) {
  const { request } = route.params;
  // request = { otpDocID, providerName, facilityName, expiresAt, otpCode }

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [codeRevealed, setCodeRevealed] = useState(false);

  useEffect(() => {
    const expiry = new Date(request.expiresAt).getTime();
    const tick = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const mins    = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs    = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft === 0;

  async function handleDeny() {
    setLoading(true);
    try {
      await denyOTP(request.otpDocID);
      Alert.alert('Denied', 'Access has been denied.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.card}>

        {/* Icon */}
        <View style={s.iconWrap}>
          <Ionicons name="shield-half-outline" size={52} color={TEAL} />
        </View>

        <Text style={s.heading}>Access Request</Text>
        <Text style={s.subheading}>
          A provider is requesting access to your health records
        </Text>

        {/* Provider info */}
        <View style={s.infoBox}>
          <Row icon="person-outline"   label="Doctor"   value={`Dr. ${request.providerName}`} />
          <Row icon="business-outline" label="Facility" value={request.facilityName} />
          <Row
            icon="time-outline"
            label="Expires"
            value={expired ? 'Expired' : `${mins}:${secs}`}
            valueColor={expired ? '#EF4444' : secondsLeft < 60 ? '#F59E0B' : TEAL}
          />
        </View>

        {expired ? (
          <View style={s.expiredBanner}>
            <Text style={s.expiredText}>This request has expired. No action needed.</Text>
          </View>
        ) : (
          <>
            {/* OTP Code Display — prototype demo */}
            <View style={s.otpSection}>
              <Text style={s.otpLabel}>Your One-Time Access Code</Text>
              <Text style={s.otpSubLabel}>
                Share this code with the provider only if you consent to this access
              </Text>

              {codeRevealed ? (
                <View style={s.codeBox}>
                  <Text style={s.codeText}>{request.otpCode}</Text>
                  <Text style={s.codeHint}>Read this code to Dr. {request.providerName}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.revealBtn}
                  onPress={() => setCodeRevealed(true)}>
                  <Ionicons name="eye-outline" size={20} color={TEAL} />
                  <Text style={s.revealText}>Tap to reveal code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Prototype notice */}
            <View style={s.noticeBanner}>
              <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
              <Text style={s.noticeText}>
                Prototype mode — in production this code arrives via SMS
              </Text>
            </View>

            {/* Deny button */}
            <TouchableOpacity
              style={s.denyBtn}
              onPress={handleDeny}
              disabled={loading}>
              {loading
                ? <ActivityIndicator color="#DC2626" />
                : <>
                    <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
                    <Text style={s.denyText}>Deny Access</Text>
                  </>
              }
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, valueColor }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={18} color="#6B7280" style={{ width: 24 }} />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', padding: 20 },
  card:          { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 3 },
  iconWrap:      { alignItems: 'center', marginBottom: 12 },
  heading:       { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subheading:    { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  infoBox:       { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, gap: 12, marginBottom: 20 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel:      { fontSize: 13, color: '#6B7280', width: 60 },
  rowValue:      { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  otpSection:    { alignItems: 'center', marginBottom: 16 },
  otpLabel:      { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  otpSubLabel:   { fontSize: 12, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  codeBox:       { backgroundColor: '#F0FDFA', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: TEAL, width: '100%' },
  codeText:      { fontSize: 42, fontWeight: '800', color: TEAL, letterSpacing: 8, fontFamily: 'monospace' },
  codeHint:      { fontSize: 12, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  revealBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDFA', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: TEAL, width: '100%', justifyContent: 'center' },
  revealText:    { color: TEAL, fontWeight: '700', fontSize: 15 },
  noticeBanner:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 16 },
  noticeText:    { fontSize: 11, color: '#6B7280', flex: 1 },
  denyBtn:       { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 12, padding: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 10 },
  denyText:      { color: '#DC2626', fontWeight: '700', fontSize: 15 },
  backBtn:       { alignItems: 'center', marginTop: 4 },
  backText:      { color: '#9CA3AF', fontSize: 13 },
  expiredBanner: { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 14, marginBottom: 16 },
  expiredText:   { color: '#991B1B', textAlign: 'center', fontWeight: '600' },
});