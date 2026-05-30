import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView, Platform
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { registerPatient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TEAL  = '#0B6E6E';
const isWeb = Platform.OS === 'web';

export default function RegisterScreen({ navigation }) {
  const setUser           = useAuthStore(s => s.setUser);
  const setPatientProfile = useAuthStore(s => s.setPatientProfile);

  const [form, setForm] = useState({
    firstName: '', fatherName: '', grandfatherName: '',
    dateOfBirth: '', sex: 'Male',
    fanNumber: '', phone: '', region: '', city: '',
    bloodType: '', email: '', password: '',
  });
  const [loading, setLoading] = useState(false);

  const field = (key, extra = {}) => ({
    value:                form[key],
    onChangeText:         (v) => setForm(p => ({ ...p, [key]: v })),
    style:                s.input,
    placeholderTextColor: '#9CA3AF',
    ...extra,
  });

  function validateFAN(fan) { return /^\d{16}$/.test(fan); }

  async function handleRegister() {
    const { firstName, fatherName, grandfatherName, dateOfBirth, sex, fanNumber, phone, email, password } = form;
    if (!firstName || !fatherName || !grandfatherName)
      return Alert.alert('Missing Fields', "First, father's, and grandfather's names are all required.");
    if (!dateOfBirth || !phone || !email || !password)
      return Alert.alert('Missing Fields', 'Please fill in all required fields.');
    if (!fanNumber)
      return Alert.alert('FAN Required', 'Please enter your 16-digit Fayda Account Number.');
    if (!validateFAN(fanNumber))
      return Alert.alert('Invalid FAN', 'FAN must be exactly 16 digits, numbers only.');

    setLoading(true);
    try {
      const cred        = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUID = cred.user.uid;
      const res         = await registerPatient({ ...form, lastName: fatherName, firebaseUID });
      const profile     = { ...form, lastName: fatherName, patientID: res.data.patientID, firebaseUID };
      setUser(cred.user);
      setPatientProfile(profile);
    } catch (err) {
      Alert.alert('Registration Failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Web version — pure HTML/CSS, no RN layout conflicts ──────────────────────
  if (isWeb) {
    const inp = {
      display: 'block', width: '100%', padding: '10px 12px', fontSize: 15,
      border: '1px solid #D1D5DB', borderRadius: 10, backgroundColor: '#F9FAFB',
      color: '#111827', boxSizing: 'border-box', marginBottom: 4, outline: 'none',
      fontFamily: 'inherit',
    };
    const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, marginTop: 12 };
    const sec = { fontSize: 14, fontWeight: 800, color: TEAL, marginTop: 24, marginBottom: 4, borderBottom: '1px solid #E5E7EB', paddingBottom: 4, display: 'block' };
    const chipRow = { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 };
    const chip = (active) => ({
      padding: '8px 14px', borderRadius: 8, border: `1px solid ${active ? TEAL : '#D1D5DB'}`,
      backgroundColor: active ? TEAL : '#fff', color: active ? '#fff' : '#374151',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
    });

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#F0F4F8', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{ backgroundColor: TEAL, height: 56, display: 'flex', alignItems: 'center', paddingLeft: 32, flexShrink: 0 }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>🏥 MedLink Ethiopia</span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 16px 80px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, padding: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: 'fit-content' }}>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Create Your MedLink Account</h2>

            {/* Full Name */}
            <span style={sec}>Full Name</span>
            <label style={lbl}>First Name *</label>
            <input style={inp} value={form.firstName} onChange={e => setForm(p => ({...p, firstName: e.target.value}))} placeholder="Selam" />
            <label style={lbl}>Father's Name *</label>
            <input style={inp} value={form.fatherName} onChange={e => setForm(p => ({...p, fatherName: e.target.value}))} placeholder="Tesfaye" />
            <label style={lbl}>Grandfather's Name *</label>
            <input style={inp} value={form.grandfatherName} onChange={e => setForm(p => ({...p, grandfatherName: e.target.value}))} placeholder="Bekele" />

            {/* National ID */}
            <span style={sec}>National ID</span>
            <label style={lbl}>FAN Number * (16 digits)</label>
            <input style={inp} value={form.fanNumber} onChange={e => setForm(p => ({...p, fanNumber: e.target.value}))} placeholder="1234567890123456" maxLength={16} />
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>Your Fayda Account Number from your Ethiopian National ID card.</p>

            {/* Personal Info */}
            <span style={sec}>Personal Information</span>
            <label style={lbl}>Date of Birth * (YYYY-MM-DD)</label>
            <input style={inp} value={form.dateOfBirth} onChange={e => setForm(p => ({...p, dateOfBirth: e.target.value}))} placeholder="1990-05-15" />

            <label style={lbl}>Sex *</label>
            <div style={chipRow}>
              {['Male','Female','Other'].map(opt => (
                <button key={opt} style={chip(form.sex === opt)} onClick={() => setForm(p => ({...p, sex: opt}))}>{opt}</button>
              ))}
            </div>

            <label style={lbl}>Blood Type</label>
            <div style={chipRow}>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                <button key={bt} style={chip(form.bloodType === bt)} onClick={() => setForm(p => ({...p, bloodType: bt}))}>{bt}</button>
              ))}
            </div>

            {/* Contact */}
            <span style={sec}>Contact & Location</span>
            <label style={lbl}>Phone Number * (e.g. +251911234567)</label>
            <input style={inp} value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+251911234567" />
            <label style={lbl}>Region</label>
            <input style={inp} value={form.region} onChange={e => setForm(p => ({...p, region: e.target.value}))} placeholder="Addis Ababa" />
            <label style={lbl}>City</label>
            <input style={inp} value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))} placeholder="Addis Ababa" />

            {/* Credentials */}
            <span style={sec}>Account Credentials</span>
            <label style={lbl}>Email Address *</label>
            <input style={inp} type="text" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="selam@example.com" />
            <label style={lbl}>Password *</label>
            <input style={inp} type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="Min. 6 characters" />

            {/* Submit */}
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{ display: 'block', width: '100%', padding: '16px', backgroundColor: TEAL, color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 28 }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <span
                onClick={() => navigation.navigate('Login')}
                style={{ color: TEAL, fontWeight: 600, cursor: 'pointer' }}>
                Already have an account? Sign In
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Native (Android) layout — completely unchanged ───────────────────────────
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.container}>
          <Text style={s.title}>Create Your MedLink Account</Text>

          <Text style={s.sectionHeader}>Full Name</Text>
          <Text style={s.label}>First Name *</Text>
          <TextInput {...field('firstName')} placeholder="Selam" />
          <Text style={s.label}>Father's Name *</Text>
          <TextInput {...field('fatherName')} placeholder="Tesfaye" />
          <Text style={s.label}>Grandfather's Name *</Text>
          <TextInput {...field('grandfatherName')} placeholder="Bekele" />

          <Text style={s.sectionHeader}>National ID</Text>
          <Text style={s.label}>FAN Number * (16 digits)</Text>
          <TextInput {...field('fanNumber')} placeholder="1234567890123456" keyboardType="numeric" maxLength={16} />
          <Text style={s.hint}>Your Fayda Account Number from your Ethiopian National ID card.</Text>

          <Text style={s.sectionHeader}>Personal Information</Text>
          <Text style={s.label}>Date of Birth * (YYYY-MM-DD)</Text>
          <TextInput {...field('dateOfBirth')} placeholder="1990-05-15" />
          <Picker label="Sex *"      options={['Male','Female','Other']}                    fieldKey="sex" />
          <Picker label="Blood Type" options={['A+','A-','B+','B-','AB+','AB-','O+','O-']} fieldKey="bloodType" />

          <Text style={s.sectionHeader}>Contact & Location</Text>
          <Text style={s.label}>Phone Number * (e.g. +251911234567)</Text>
          <TextInput {...field('phone')} placeholder="+251911234567" keyboardType="phone-pad" />
          <Text style={s.label}>Region</Text>
          <TextInput {...field('region')} placeholder="Addis Ababa" />
          <Text style={s.label}>City</Text>
          <TextInput {...field('city')} placeholder="Addis Ababa" />

          <Text style={s.sectionHeader}>Account Credentials</Text>
          <Text style={s.label}>Email Address *</Text>
          <TextInput {...field('email')} placeholder="selam@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Text style={s.label}>Password *</Text>
          <TextInput {...field('password')} placeholder="Min. 6 characters" secureTextEntry />

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.link}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { padding: 24, paddingBottom: 60 },
  title:          { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  sectionHeader:  { fontSize: 14, fontWeight: '800', color: TEAL, marginTop: 24, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 4 },
  label:          { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input:          { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827', marginBottom: 2 },
  hint:           { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },
  row:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  chipActive:     { backgroundColor: TEAL, borderColor: TEAL },
  chipText:       { color: '#374151', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn:            { backgroundColor: TEAL, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:           { textAlign: 'center', color: TEAL, marginTop: 16, fontWeight: '600', paddingBottom: 16 },
});