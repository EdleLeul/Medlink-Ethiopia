import { OfflineBanner } from '../../components/OfflineBanner';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  SafeAreaView, Alert, ActivityIndicator, Share,
  RefreshControl, Clipboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { createSharePass, listSharePasses, revokeSharePass, getRecords } from '../../services/api';
import { AccountSwitcher } from '../../components/AccountSwitcher';

const TEAL = '#0B6E6E';

const DURATION_OPTIONS = [
  { key: '48h', label: '48 Hours',  desc: 'Short visit or ER' },
  { key: '7d',  label: '7 Days',    desc: 'Medical appointment' },
  { key: '30d', label: '30 Days',   desc: 'Extended treatment' },
];

export default function TravelScreen({ navigation }) {
  const activeProfile   = useAuthStore(s => s.activeProfile);
  const activePatientID = useAuthStore(s => s.activePatientID());

  const [tab, setTab]             = useState('share');  // 'share' | 'pdf' | 'card'
  const [passes, setPasses]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('7d');

  const patientName = [
    activeProfile?.firstName,
    activeProfile?.fatherName || activeProfile?.lastName,
  ].filter(Boolean).join(' ');

  useEffect(() => { loadPasses(); }, [activePatientID]);

  async function loadPasses() {
    try {
      const res = await listSharePasses(activePatientID);
      setPasses(res.data.passes || []);
    } catch (e) {
      console.warn('Load passes error:', e.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreatePass() {
    setCreating(true);
    try {
      const res = await createSharePass(activePatientID, selectedDuration);
      const { shareURL, expiresAt } = res.data;

      setPasses(p => [{
        passID:    res.data.passID,
        token:     res.data.token,
        duration:  selectedDuration,
        expiresAt: new Date(expiresAt),
        viewCount: 0,
        shareURL,
      }, ...p]);

      
      Alert.alert(
        'Share Link Created',
        `Your health summary link is ready. Share it with your foreign healthcare provider.\n\nExpires: ${new Date(expiresAt).toLocaleDateString()}`,
        [
          { text: 'Share Now', onPress: () => shareURL && Share.share({ message: shareURL, title: 'My MedLink Health Summary' }) },
          { text: 'Copy Link', onPress: () => Clipboard.setString(shareURL) },
          { text: 'OK' },
        ]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(passID) {
    Alert.alert(
      'Revoke Access',
      'This will immediately block anyone using this link. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke', style: 'destructive',
          onPress: async () => {
            try {
              await revokeSharePass(passID);
              setPasses(p => p.filter(pass => pass.passID !== passID));
              Alert.alert('Revoked', 'Access has been blocked immediately.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  }

  function formatExpiry(date) {
    const d = date instanceof Date ? date : new Date(date);
    const diff = Math.ceil((d - Date.now()) / (1000 * 60 * 60 * 24));
    return `${d.toLocaleDateString('en-ET')} (${diff}d left)`;
  }

  // ── Generate Travel PDF text ──────────────────────────────────────────────
  async function handleTravelPDF() {
    setLoading(true);
    try {
      const [allergies, medications, diagnoses, vaccinations] = await Promise.all([
        getRecords(activePatientID, 'allergies'),
        getRecords(activePatientID, 'medications'),
        getRecords(activePatientID, 'diagnoses'),
        getRecords(activePatientID, 'vaccinations'),
      ]);

      const a  = allergies.data.records    || [];
      const m  = medications.data.records  || [];
      const d  = diagnoses.data.records    || [];
      const v  = vaccinations.data.records || [];

      const activeAllergies  = a.filter(r => r.allergen);
      const activeMeds       = m.filter(r => r.active !== false);
      const activeDiagnoses  = d.filter(r => r.status !== 'resolved');

      const lines = [
        '══════════════════════════════════════════',
        '           MEDLINK ETHIOPIA',
        '         TRAVEL HEALTH SUMMARY',
        '══════════════════════════════════════════',
        '',
        `Patient:      ${patientName}`,
        `MedLink ID:   ${activePatientID}`,
        `DOB:          ${activeProfile?.dateOfBirth || '—'}`,
        `Sex:          ${activeProfile?.sex || '—'}`,
        `Blood Type:   ${activeProfile?.bloodType || '—'}`,
        `Generated:    ${new Date().toLocaleDateString('en-ET')}`,
        '',
        '── ALLERGIES ──────────────────────────────',
        activeAllergies.length === 0
          ? 'No known allergies'
          : activeAllergies.map(r =>
              `⚠ ${r.allergen} (${r.allergyType || 'unknown'}) — ${r.reaction || ''}${r.severity ? ` [${r.severity}]` : ''}`
            ).join('\n'),
        '',
        '── ACTIVE MEDICATIONS ─────────────────────',
        activeMeds.length === 0
          ? 'None'
          : activeMeds.map(r =>
              `• ${r.drugName} ${r.dosage || ''} ${r.frequency || ''}`
            ).join('\n'),
        '',
        '── ACTIVE DIAGNOSES ───────────────────────',
        activeDiagnoses.length === 0
          ? 'None'
          : activeDiagnoses.map(r =>
              `• ${r.diagnosisName}${r.icdCode ? ` (ICD: ${r.icdCode})` : ''}${r.severity ? ` — ${r.severity}` : ''}`
            ).join('\n'),
        '',
        '── VACCINATIONS ───────────────────────────',
        v.length === 0
          ? 'No vaccination records'
          : v.map(r =>
              `✓ ${r.vaccineName}${r.doseNumber ? ` (Dose ${r.doseNumber})` : ''} — ${r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString() : ''}`
            ).join('\n'),
        '',
        '══════════════════════════════════════════',
        'Verify this document at:',
        'medlink.et — using the Patient ID above',
        '══════════════════════════════════════════',
        '',
        'DISCLAIMER: This is a patient-generated health',
        'summary from MedLink Ethiopia. Verify with the',
        'issuing facility for clinical decisions.',
      ].join('\n');

      await Share.share({
        message: lines,
        title:   `MedLink Travel Summary — ${patientName}`,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not generate travel summary: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <OfflineBanner />
      <View style={s.header}>
        <Text style={s.title}>✈️ International Travel</Text>
        <Text style={s.subtitle}>Share your health records with foreign providers</Text>
      </View>

      <AccountSwitcher />

      {/* Tab row */}
      <View style={s.tabRow}>
        <TabBtn label="Share Link" icon="link-outline"           active={tab === 'share'} onPress={() => setTab('share')} />
        <TabBtn label="Travel PDF" icon="document-outline"       active={tab === 'pdf'}   onPress={() => setTab('pdf')} />
        <TabBtn label="Emergency"  icon="alert-circle-outline"   active={tab === 'card'}  onPress={() => setTab('card')} />
      </View>

      {/* ── Share Link Tab ── */}
      {tab === 'share' && (
        <ScrollView
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPasses(); }} />}>

          <View style={s.explainerBox}>
            <Ionicons name="information-circle-outline" size={20} color={TEAL} />
            <Text style={s.explainerText}>
              Generate a secure link your foreign hospital can open in any browser.
              No MedLink account needed. You control when it expires.
            </Text>
          </View>

          {/* Duration picker */}
          <Text style={s.sectionLabel}>Link Duration</Text>
          <View style={s.durationRow}>
            {DURATION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[s.durationChip, selectedDuration === opt.key && s.durationChipActive]}
                onPress={() => setSelectedDuration(opt.key)}>
                <Text style={[s.durationLabel, selectedDuration === opt.key && s.durationLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={[s.durationDesc, selectedDuration === opt.key && s.durationDescActive]}>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.createBtn} onPress={handleCreatePass} disabled={creating}>
            {creating
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={s.createBtnText}>Generate Share Link</Text>
                </>
            }
          </TouchableOpacity>

          {/* Active passes */}
          {passes.length > 0 && (
            <>
              <Text style={s.sectionLabel}>Active Links ({passes.length})</Text>
              {passes.map(pass => (
                <View key={pass.passID} style={s.passCard}>
                  <View style={s.passTop}>
                    <View style={s.passBadge}>
                      <Text style={s.passBadgeText}>{pass.duration}</Text>
                    </View>
                    <Text style={s.passExpiry}>{formatExpiry(pass.expiresAt)}</Text>
                  </View>
                  <Text style={s.passURL} numberOfLines={1}>{pass.shareURL}</Text>
                  <Text style={s.passViews}>👁 Viewed {pass.viewCount} times</Text>
                  <View style={s.passActions}>
                    <TouchableOpacity
                      style={s.shareBtn}
                      onPress={() => Share.share({ message: pass.shareURL, title: 'My MedLink Health Summary' })}>
                      <Ionicons name="share-outline" size={16} color={TEAL} />
                      <Text style={s.shareBtnText}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.copyBtn}
                      onPress={() => { Clipboard.setString(pass.shareURL); Alert.alert('Copied', 'Link copied to clipboard'); }}>
                      <Ionicons name="copy-outline" size={16} color="#374151" />
                      <Text style={s.copyBtnText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.revokeBtn} onPress={() => handleRevoke(pass.passID)}>
                      <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                      <Text style={s.revokeBtnText}>Revoke</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {passes.length === 0 && !creating && (
            <View style={s.emptyPasses}>
              <Ionicons name="link-outline" size={40} color="#D1D5DB" />
              <Text style={s.emptyText}>No active share links</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Travel PDF Tab ── */}
      {tab === 'pdf' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.explainerBox}>
            <Ionicons name="document-text-outline" size={20} color={TEAL} />
            <Text style={s.explainerText}>
              Download a complete health summary you can save to your phone, print, or email.
              Works even without internet at the foreign hospital.
            </Text>
          </View>

          <View style={s.pdfPreview}>
            <Text style={s.pdfPreviewTitle}>What's included:</Text>
            {[
              ['warning-outline',          '#EF4444', 'Allergies (critical for treatment)'],
              ['fitness-outline',          TEAL,      'Active medications'],
              ['medkit-outline',           '#8B5CF6', 'Active diagnoses'],
              ['shield-checkmark-outline', '#10B981', 'Vaccination history'],
              ['water-outline',            '#DC2626', 'Blood type'],
              ['qr-code-outline',          TEAL,      'Verification QR code'],
            ].map(([icon, color, label]) => (
              <View key={label} style={s.pdfItem}>
                <Ionicons name={icon} size={16} color={color} />
                <Text style={s.pdfItemText}>{label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.createBtn} onPress={handleTravelPDF} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={s.createBtnText}>Generate & Share Travel Summary</Text>
                </>
            }
          </TouchableOpacity>

          <Text style={s.pdfNote}>
            The summary opens your device's share sheet. You can save it as a file,
            send via WhatsApp, or email it to the hospital in advance.
          </Text>
        </ScrollView>
      )}

      {/* ── Emergency Card Tab ── */}
      {tab === 'card' && (
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.explainerBox}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <Text style={s.explainerText}>
              Critical information for emergency responders. Save this to your phone's
              photo gallery or print before traveling.
            </Text>
          </View>

          {/* Emergency card preview */}
          <View style={s.emergencyCard}>
            <View style={s.emergencyHeader}>
              <Text style={s.emergencyTitle}>🚨 EMERGENCY MEDICAL INFORMATION</Text>
              <Text style={s.emergencySubtitle}>MedLink Ethiopia</Text>
            </View>

            <View style={s.emergencyBody}>
              <EmRow label="Name"       value={patientName} />
              <EmRow label="MedLink ID" value={activePatientID} mono />
              <EmRow label="DOB"        value={activeProfile?.dateOfBirth || '—'} />
              <EmRow label="Sex"        value={activeProfile?.sex || '—'} />
              <EmRow label="Blood Type" value={activeProfile?.bloodType || '—'} bold red={activeProfile?.bloodType} />
            </View>

            <View style={s.emergencySection}>
              <Text style={s.emergencySectionTitle}>⚠️ ALLERGIES</Text>
              <Text style={s.emergencyNote}>See full record via QR or MedLink ID above</Text>
            </View>

            <View style={s.emergencySection}>
              <Text style={s.emergencySectionTitle}>💊 MEDICATIONS</Text>
              <Text style={s.emergencyNote}>See full record via QR or MedLink ID above</Text>
            </View>

            <View style={s.emergencyFooter}>
              <Text style={s.emergencyFooterText}>
                Scan QR or visit medlink.et with ID: {activePatientID}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.createBtn}
            onPress={async () => {
              const card = `🚨 EMERGENCY MEDICAL INFO — MedLink Ethiopia\n\nName: ${patientName}\nID: ${activePatientID}\nDOB: ${activeProfile?.dateOfBirth || '—'}\nSex: ${activeProfile?.sex || '—'}\nBlood Type: ${activeProfile?.bloodType || '—'}\n\nFor full records: medlink.et\nPatient ID: ${activePatientID}`;
              await Share.share({ message: card, title: 'Emergency Medical Info' });
            }}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={s.createBtnText}>Save / Share Emergency Card</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function TabBtn({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity style={[s.tabBtn, active && s.tabBtnActive]} onPress={onPress}>
      <Ionicons name={icon} size={16} color={active ? TEAL : '#9CA3AF'} />
      <Text style={[s.tabBtnText, active && s.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmRow({ label, value, mono, bold, red }) {
  return (
    <View style={s.emRow}>
      <Text style={s.emLabel}>{label}</Text>
      <Text style={[
        s.emValue,
        mono  && { fontFamily: 'monospace' },
        bold  && { fontWeight: '800' },
        red   && { color: '#DC2626' },
      ]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header:               { padding: 20, paddingBottom: 8 },
  title:                { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:             { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tabRow:               { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, gap: 4 },
  tabBtn:               { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 9 },
  tabBtnActive:         { backgroundColor: '#fff', elevation: 2 },
  tabBtnText:           { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  tabBtnTextActive:     { color: TEAL },
  content:              { padding: 16, paddingBottom: 60 },
  explainerBox:         { flexDirection: 'row', gap: 10, backgroundColor: '#F0FDFA', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#CCFBF1' },
  explainerText:        { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  sectionLabel:         { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10, marginTop: 4 },
  durationRow:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
  durationChip:         { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  durationChipActive:   { borderColor: TEAL, backgroundColor: '#F0FDFA' },
  durationLabel:        { fontSize: 13, fontWeight: '700', color: '#374151' },
  durationLabelActive:  { color: TEAL },
  durationDesc:         { fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
  durationDescActive:   { color: TEAL },
  createBtn:            { backgroundColor: TEAL, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 20 },
  createBtnText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
  passCard:             { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  passTop:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  passBadge:            { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  passBadgeText:        { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  passExpiry:           { fontSize: 12, color: '#6B7280' },
  passURL:              { fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 4 },
  passViews:            { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  passActions:          { flexDirection: 'row', gap: 8 },
  shareBtn:             { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#F0FDFA', borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: TEAL },
  shareBtnText:         { color: TEAL, fontWeight: '600', fontSize: 13 },
  copyBtn:              { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#F9FAFB', borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  copyBtnText:          { color: '#374151', fontWeight: '600', fontSize: 13 },
  revokeBtn:            { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', borderRadius: 8, paddingVertical: 8, borderWidth: 1, borderColor: '#FECACA' },
  revokeBtnText:        { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  emptyPasses:          { alignItems: 'center', marginTop: 40, gap: 8 },
  emptyText:            { color: '#9CA3AF', fontSize: 14 },
  pdfPreview:           { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  pdfPreviewTitle:      { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  pdfItem:              { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  pdfItemText:          { fontSize: 14, color: '#374151' },
  pdfNote:              { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  emergencyCard:        { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: '#EF4444', marginBottom: 20 },
  emergencyHeader:      { backgroundColor: '#EF4444', padding: 14, alignItems: 'center' },
  emergencyTitle:       { fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emergencySubtitle:    { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  emergencyBody:        { padding: 16, gap: 8 },
  emergencySection:     { padding: 12, borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  emergencySectionTitle:{ fontSize: 13, fontWeight: '700', color: '#DC2626', marginBottom: 4 },
  emergencyNote:        { fontSize: 12, color: '#6B7280' },
  emergencyFooter:      { backgroundColor: '#FEF2F2', padding: 10, alignItems: 'center' },
  emergencyFooterText:  { fontSize: 11, color: '#6B7280', textAlign: 'center', fontFamily: 'monospace' },
  emRow:                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emLabel:              { fontSize: 13, color: '#6B7280' },
  emValue:              { fontSize: 14, color: '#111827' },
});