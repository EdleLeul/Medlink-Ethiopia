import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import { registerChild } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TEAL = '#0B6E6E';

export default function AddChildScreen({ navigation }) {
  const addChild = useAuthStore(s => s.addChild);

  const [form, setForm] = useState({
    firstName: '', fatherName: '', grandfatherName: '',
    dateOfBirth: '', sex: 'Male',
    fanNumber: '', bloodType: '', relationship: 'Parent',
  });
  const [loading, setLoading] = useState(false);

  const field = (key, props = {}) => ({
    value:           form[key],
    onChangeText:    (v) => setForm(p => ({ ...p, [key]: v })),
    style:           s.input,
    placeholderTextColor: '#9CA3AF',
    ...props,
  });

  function validateFAN(fan) {
    return /^\d{16}$/.test(fan);
  }

  async function handleSubmit() {
    const { firstName, fatherName, grandfatherName, dateOfBirth, sex, fanNumber } = form;

    if (!firstName || !fatherName || !grandfatherName) {
      return Alert.alert('Missing Fields', 'First name, father\'s name, and grandfather\'s name are all required.');
    }
    if (!dateOfBirth || !sex) {
      return Alert.alert('Missing Fields', 'Date of birth and sex are required.');
    }
    if (!fanNumber) {
      return Alert.alert('FAN Number Required', 'Please enter the child\'s 16-digit Fayda Account Number.');
    }
    if (!validateFAN(fanNumber)) {
      return Alert.alert('Invalid FAN Number', 'FAN number must be exactly 16 digits.');
    }

    const age = (Date.now() - new Date(dateOfBirth)) / (365.25 * 24 * 3600 * 1000);
    if (age >= 18) {
      return Alert.alert('Invalid Age', 'Child accounts are only for patients under 18 years old.');
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        lastName: fatherName,
      };
      const res = await registerChild(payload);
      addChild({
        ...payload,
        patientID: res.data.patientID,
        isChild: true,
      });
      Alert.alert(
        'Account Created',
        `${firstName}'s MedLink ID is:\n${res.data.patientID}`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  function Picker({ label, options, fieldKey }) {
    return (
      <>
        <Text style={s.label}>{label}</Text>
        <View style={s.row}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[s.chip, form[fieldKey] === opt && s.chipActive]}
              onPress={() => setForm(p => ({ ...p, [fieldKey]: opt }))}>
              <Text style={[s.chipText, form[fieldKey] === opt && s.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView contentContainerStyle={s.container}>
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Add Child Account</Text>
        <Text style={s.subtitle}>
          All provider access requests for this child will be sent to your phone number.
        </Text>

        {/* ── Name ── */}
        <Text style={s.sectionHeader}>Full Name</Text>
        <Text style={s.label}>First Name *</Text>
        <TextInput {...field('firstName')} placeholder="Dawit" />

        <Text style={s.label}>Father's Name *</Text>
        <TextInput {...field('fatherName')} placeholder="Abebe" />

        <Text style={s.label}>Grandfather's Name *</Text>
        <TextInput {...field('grandfatherName')} placeholder="Tesfaye" />

        {/* ── FAN ── */}
        <Text style={s.sectionHeader}>National ID</Text>
        <Text style={s.label}>FAN Number * (16 digits)</Text>
        <TextInput
          {...field('fanNumber')}
          placeholder="1234567890123456"
          keyboardType="numeric"
          maxLength={16}
        />
        <Text style={s.hint}>
          The child's Fayda Account Number from their Ethiopian National ID card.
        </Text>

        {/* ── Personal ── */}
        <Text style={s.sectionHeader}>Personal Information</Text>
        <Text style={s.label}>Date of Birth * (YYYY-MM-DD)</Text>
        <TextInput {...field('dateOfBirth')} placeholder="2018-03-10" />

        <Picker label="Sex *"        options={['Male','Female','Other']}              fieldKey="sex" />
        <Picker label="Relationship" options={['Parent','Guardian','Grandparent']}    fieldKey="relationship" />
        <Picker label="Blood Type"   options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} fieldKey="bloodType" />

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitText}>Create Child Account</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { padding: 24, paddingBottom: 60 },
  backRow:        { marginBottom: 8 },
  backText:       { color: TEAL, fontWeight: '600', fontSize: 14 },
  title:          { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle:       { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 20 },
  sectionHeader:  { fontSize: 15, fontWeight: '800', color: TEAL, marginTop: 24, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 4 },
  label:          { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input:          { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  hint:           { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },
  row:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  chipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  chipText:       { color: '#374151', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn:      { backgroundColor: TEAL, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 32 },
  submitText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});