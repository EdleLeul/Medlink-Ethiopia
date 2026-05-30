// ═══════════════════════════════════════════════════════════════════════════════
// Shared RecordList component — used by all 12 EMR screens
// ═══════════════════════════════════════════════════════════════════════════════

import { OfflineBanner } from '../../components/OfflineBanner';
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRecords } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TEAL = '#0B6E6E';

export function RecordList({ recordType, renderItem, emptyIcon, emptyText }) {
  const activePatientID = useAuthStore(s => s.activePatientID());
  const [records, setRecords]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [cacheInfo, setCacheInfo] = useState({ isCache: false, savedAt: null });


  async function load() {
    try {
      setError(null);
      const res = await getRecords(activePatientID, recordType);
      setRecords(res.data.records || []);
      if (res.isCache) {
        setCacheInfo({ isCache: true, savedAt: res.savedAt });
      } else {
        setCacheInfo({ isCache: false, savedAt: null });
      }
    } catch (err) {
      setError(err?.message || 'Unable to load records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [activePatientID]);

  if (loading) return <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 60 }} />;

  if (error) return (
    <View style={ls.center}>
      <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
      <Text style={ls.errorText}>{error}</Text>
    </View>
  );

  return (
    <>
      <OfflineBanner isCache={cacheInfo.isCache} savedAt={cacheInfo.savedAt} />
      <FlatList
        data={records}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={ls.center}>
            <Ionicons name={emptyIcon || 'document-outline'} size={48} color="#D1D5DB" />
            <Text style={ls.emptyText}>{emptyText || 'No records yet'}</Text>
          </View>
        }
        renderItem={({ item }) => renderItem(item)}
      />
    </>
  );
}

const ls = StyleSheet.create({
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#9CA3AF', fontSize: 15, marginTop: 12, textAlign: 'center' },
  errorText: { color: '#EF4444', fontSize: 14, marginTop: 12, textAlign: 'center' },
});

// Shared card style
export const card = StyleSheet.create({
  box:      { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title:    { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  date:     { fontSize: 12, color: '#9CA3AF' },
  provider: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 6 },
  badgeText:{ fontSize: 11, fontWeight: '700' },
  detail:   { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 19 },
});

function fmt(ts) {
  if (!ts) return '—';
  try {
    let d;
    if (ts.toDate)              d = ts.toDate();           // Firestore Timestamp
    else if (ts._seconds)       d = new Date(ts._seconds * 1000); // serialised Timestamp
    else if (ts.seconds)        d = new Date(ts.seconds * 1000);  // another format
    else                        d = new Date(ts);           // string or number
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return '—';
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/ConsultationsScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function ConsultationsScreen() {
  return (
    <RecordList recordType="consultations" emptyIcon="chatbubble-outline"
      emptyText="No consultations recorded yet"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.chiefComplaint || 'Consultation'}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>Dr. {item.providerName} · {item.facilityName}</Text>
          {item.presentingHistory && <Text style={card.detail}>{item.presentingHistory}</Text>}
          {item.clinicalFindings  && <Text style={card.detail}>Findings: {item.clinicalFindings}</Text>}
          {item.plan              && <Text style={card.detail}>Plan: {item.plan}</Text>}
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/DiagnosisScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
const SEVERITY_COLORS = { mild: '#D1FAE5', moderate: '#FEF3C7', severe: '#FEE2E2' };
const SEVERITY_TEXT   = { mild: '#065F46', moderate: '#92400E', severe: '#991B1B' };

export function DiagnosisScreen() {
  return (
    <RecordList recordType="diagnoses" emptyIcon="medkit-outline"
      emptyText="No diagnoses recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.diagnosisName}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          {item.icdCode && <Text style={{ fontSize: 12, color: '#6B7280' }}>ICD: {item.icdCode}</Text>}
          <Text style={card.provider}>Dr. {item.providerName} · {item.facilityName}</Text>
          {item.severity && (
            <View style={[card.badge, { backgroundColor: SEVERITY_COLORS[item.severity] || '#F3F4F6' }]}>
              <Text style={[card.badgeText, { color: SEVERITY_TEXT[item.severity] || '#374151' }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
          )}
          {item.notes && <Text style={card.detail}>{item.notes}</Text>}
          {item.status && <Text style={[card.detail, { fontStyle: 'italic' }]}>Status: {item.status}</Text>}
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/MedicationsScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function MedicationsScreen() {
  return (
    <RecordList recordType="medications" emptyIcon="fitness-outline"
      emptyText="No medications on record"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.drugName}</Text>
            <View style={[card.badge, { backgroundColor: item.active ? '#D1FAE5' : '#F3F4F6' }]}>
              <Text style={[card.badgeText, { color: item.active ? '#065F46' : '#6B7280' }]}>
                {item.active ? 'ACTIVE' : 'PAST'}
              </Text>
            </View>
          </View>
          <Text style={card.provider}>Prescribed by Dr. {item.providerName}</Text>
          {item.dosage    && <Text style={card.detail}>Dose: {item.dosage}</Text>}
          {item.frequency && <Text style={card.detail}>Frequency: {item.frequency}</Text>}
          {item.duration  && <Text style={card.detail}>Duration: {item.duration}</Text>}
          {item.indication && <Text style={card.detail}>For: {item.indication}</Text>}
          <Text style={card.date}>{fmt(item.createdAt)}</Text>
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/LabResultsScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function LabResultsScreen() {
  return (
    <RecordList recordType="labResults" emptyIcon="flask-outline"
      emptyText="No lab results recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.testName}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>{item.facilityName}</Text>
          {item.result    && <Text style={card.detail}>Result: {item.result} {item.unit || ''}</Text>}
          {item.normalRange && <Text style={card.detail}>Normal Range: {item.normalRange}</Text>}
          {item.interpretation && (
            <View style={[card.badge, {
              backgroundColor: item.interpretation === 'Normal' ? '#D1FAE5' : '#FEE2E2'
            }]}>
              <Text style={[card.badgeText, {
                color: item.interpretation === 'Normal' ? '#065F46' : '#991B1B'
              }]}>{item.interpretation}</Text>
            </View>
          )}
          {item.notes && <Text style={card.detail}>{item.notes}</Text>}
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/AllergiesScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function AllergiesScreen() {
  return (
    <RecordList recordType="allergies" emptyIcon="warning-outline"
      emptyText="No allergies recorded"
      renderItem={item => (
        <View style={[card.box, { borderLeftWidth: 4, borderLeftColor: '#EF4444' }]}>
          <View style={card.row}>
            <Text style={card.title}>{item.allergen}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>Type: {item.allergyType}</Text>
          {item.reaction  && <Text style={card.detail}>Reaction: {item.reaction}</Text>}
          {item.severity  && <Text style={card.detail}>Severity: {item.severity}</Text>}
          {item.onsetDate && <Text style={card.detail}>Onset: {item.onsetDate}</Text>}
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/VaccinationsScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function VaccinationsScreen() {
  return (
    <RecordList recordType="vaccinations" emptyIcon="shield-checkmark-outline"
      emptyText="No vaccinations recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.vaccineName}</Text>
            <View style={[card.badge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[card.badgeText, { color: '#065F46' }]}>✓ Given</Text>
            </View>
          </View>
          {item.doseNumber    && <Text style={card.provider}>Dose {item.doseNumber}</Text>}
          {item.manufacturer  && <Text style={card.detail}>Manufacturer: {item.manufacturer}</Text>}
          {item.lotNumber     && <Text style={card.detail}>Lot: {item.lotNumber}</Text>}
          {item.site          && <Text style={card.detail}>Site: {item.site}</Text>}
          {item.nextDoseDate  && <Text style={card.detail}>Next dose: {item.nextDoseDate}</Text>}
          <Text style={card.date}>{fmt(item.createdAt)}</Text>
        </View>
      )} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/VitalsScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function VitalsScreen() {
  return (
    <RecordList recordType="vitals" emptyIcon="heart-outline"
      emptyText="No vitals recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>Vitals Reading</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>Recorded by Dr. {item.providerName} · {item.facilityName}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {item.bloodPressure && <VitalChip label="BP"     value={item.bloodPressure} unit="mmHg" />}
            {item.heartRate     && <VitalChip label="HR"     value={item.heartRate}     unit="bpm" />}
            {item.temperature   && <VitalChip label="Temp"   value={item.temperature}   unit="°C" />}
            {item.spO2          && <VitalChip label="SpO₂"   value={item.spO2}          unit="%" />}
            {item.weight        && <VitalChip label="Weight" value={item.weight}        unit="kg" />}
            {item.height        && <VitalChip label="Height" value={item.height}        unit="cm" />}
            {item.bmi           && <VitalChip label="BMI"    value={item.bmi}           unit="" />}
          </View>
        </View>
      )} />
  );
}

function VitalChip({ label, value, unit }) {
  return (
    <View style={{ backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, minWidth: 80, alignItems: 'center' }}>
      <Text style={{ fontSize: 11, color: '#6B7280' }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1D4ED8' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#93C5FD' }}>{unit}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// screens/records/DoctorNotesScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
export function DoctorNotesScreen() {
  return (
    <RecordList recordType="doctorNotes" emptyIcon="document-text-outline"
      emptyText="No doctor notes on file"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.noteTitle || 'Clinical Note'}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>Dr. {item.providerName} · {item.facilityName}</Text>
          {item.noteType && <Text style={[card.detail, { fontStyle: 'italic', color: '#6B7280' }]}>{item.noteType}</Text>}
          {item.content  && <Text style={card.detail}>{item.content}</Text>}
        </View>
      )} />
  );
}


// Remaining screens (Radiology, SurgicalHistory, FamilyHistory) follow same pattern:

export function RadiologyScreen() {
  return (
    <RecordList recordType="radiology" emptyIcon="image-outline"
      emptyText="No imaging studies recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.studyType}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>{item.bodyPart && `${item.bodyPart} · `}{item.facilityName}</Text>
          {item.findings    && <Text style={card.detail}>Findings: {item.findings}</Text>}
          {item.impression  && <Text style={card.detail}>Impression: {item.impression}</Text>}
          {item.radiologist && <Text style={card.detail}>Radiologist: Dr. {item.radiologist}</Text>}
        </View>
      )} />
  );
}

export function SurgicalHistoryScreen() {
  return (
    <RecordList recordType="surgicalHistory" emptyIcon="cut-outline"
      emptyText="No surgical history recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.procedureName}</Text>
            <Text style={card.date}>{item.procedureDate || fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>{item.facilityName}</Text>
          {item.surgeon      && <Text style={card.detail}>Surgeon: Dr. {item.surgeon}</Text>}
          {item.indication   && <Text style={card.detail}>Indication: {item.indication}</Text>}
          {item.anaesthesia  && <Text style={card.detail}>Anaesthesia: {item.anaesthesia}</Text>}
          {item.complications && <Text style={card.detail}>Complications: {item.complications}</Text>}
          {item.outcome      && <Text style={card.detail}>Outcome: {item.outcome}</Text>}
        </View>
      )} />
  );
}

export function FamilyHistoryScreen() {
  return (
    <RecordList recordType="familyHistory" emptyIcon="people-outline"
      emptyText="No family history recorded"
      renderItem={item => (
        <View style={card.box}>
          <View style={card.row}>
            <Text style={card.title}>{item.condition}</Text>
            <Text style={card.date}>{fmt(item.createdAt)}</Text>
          </View>
          <Text style={card.provider}>Relation: {item.relationship}</Text>
          {item.ageOfOnset && <Text style={card.detail}>Age of onset: {item.ageOfOnset}</Text>}
          {item.notes      && <Text style={card.detail}>{item.notes}</Text>}
        </View>
      )} />
  );
}