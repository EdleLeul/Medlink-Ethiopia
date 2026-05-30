import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { AccountSwitcher } from '../../components/AccountSwitcher';

const TEAL = '#0B6E6E';

const RECORD_MODULES = [
  { screen: 'Consultations',   label: 'Consultations',      icon: 'chatbubble-ellipses-outline', color: '#3B82F6', bg: '#EFF6FF',  desc: 'Visit history & clinical findings' },
  { screen: 'Diagnosis',       label: 'Diagnoses',          icon: 'medkit-outline',              color: '#EF4444', bg: '#FEF2F2',  desc: 'Conditions & ICD codes' },
  { screen: 'Medications',     label: 'Medications',        icon: 'fitness-outline',             color: '#10B981', bg: '#ECFDF5',  desc: 'Active & past prescriptions' },
  { screen: 'LabResults',      label: 'Lab Results',        icon: 'flask-outline',               color: '#8B5CF6', bg: '#F5F3FF',  desc: 'Blood work, urine, cultures' },
  { screen: 'Radiology',       label: 'Radiology & Imaging',icon: 'scan-outline',                color: '#0EA5E9', bg: '#F0F9FF',  desc: 'X-ray, CT, MRI, ultrasound' },
  { screen: 'Allergies',       label: 'Allergies',          icon: 'warning-outline',             color: '#F59E0B', bg: '#FFFBEB',  desc: 'Drug, food & environmental' },
  { screen: 'Vaccinations',    label: 'Vaccinations',       icon: 'shield-checkmark-outline',    color: '#14B8A6', bg: '#F0FDFA',  desc: 'Immunisation history & next doses' },
  { screen: 'Vitals',          label: 'Vital Signs',        icon: 'heart-outline',               color: '#EC4899', bg: '#FDF2F8',  desc: 'BP, HR, temperature, SpO₂, BMI' },
  { screen: 'SurgicalHistory', label: 'Surgical History',   icon: 'cut-outline',                 color: '#64748B', bg: '#F8FAFC',  desc: 'Procedures & outcomes' },
  { screen: 'FamilyHistory',   label: 'Family History',     icon: 'people-outline',              color: '#D97706', bg: '#FEFCE8',  desc: 'Hereditary & genetic conditions' },
  { screen: 'Referrals',       label: 'Referrals',          icon: 'arrow-forward-circle-outline',color: '#7C3AED', bg: '#F5F3FF',  desc: 'Cross-facility referral letters' },
  { screen: 'DoctorNotes',     label: 'Doctor Notes',       icon: 'document-text-outline',       color: '#0B6E6E', bg: '#F0FDFA',  desc: 'Clinical notes & summaries' },
];

export default function RecordsMenuScreen({ navigation }) {
  const { activeProfile } = useAuthStore();
  const fatherName = activeProfile?.fatherName || activeProfile?.lastName || '';
  const displayName = [activeProfile?.firstName, fatherName].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={s.header}>
        <Text style={s.title}>Health Records</Text>
        <Text style={s.subtitle}>
          {displayName}{activeProfile?.isChild ? ' · Child Account' : ''}
        </Text>
      </View>

      <AccountSwitcher />

      <FlatList
        data={RECORD_MODULES}
        keyExtractor={item => item.screen}
        numColumns={2}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => navigation.navigate(item.screen)}>
            <View style={[s.iconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={26} color={item.color} />
            </View>
            <Text style={s.cardLabel}>{item.label}</Text>
            <Text style={s.cardDesc}>{item.desc}</Text>
            <View style={s.arrow}>
              <Ionicons name="chevron-forward" size={13} color="#D1D5DB" />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:    { padding: 20, paddingBottom: 8 },
  title:     { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card:      { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, minHeight: 120 },
  iconWrap:  { width: 46, height: 46, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  cardLabel: { fontSize: 12, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardDesc:  { fontSize: 10, color: '#9CA3AF', lineHeight: 14 },
  arrow:     { position: 'absolute', top: 10, right: 10 },
});