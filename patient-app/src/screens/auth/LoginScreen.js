import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  SafeAreaView, ScrollView, Platform
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { getPatient, getChildren } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TEAL  = '#0B6E6E';
const isWeb = Platform.OS === 'web';

export default function LoginScreen({ navigation }) {
  const setUser           = useAuthStore(s => s.setUser);
  const setPatientProfile = useAuthStore(s => s.setPatientProfile);
  const setChildren       = useAuthStore(s => s.setChildren);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password)
      return Alert.alert('Missing Fields', 'Enter your email and password.');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setUser(cred.user);
      const profileRes  = await getPatient('me');
      const childrenRes = await getChildren();
      setPatientProfile(profileRes.data);
      setChildren(childrenRes.data.children || []);
    } catch (err) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Shared form ─────────────────────────────────────────────────────────────
  const formContent = (
    <View style={isWeb ? ww.formInner : s.nativeInner}>
      <Text style={s.title}>Welcome back</Text>
      <Text style={s.sub}>Sign in to access your MedLink records</Text>

      <Text style={s.label}>Email</Text>
      <TextInput
        style={s.input} value={email} onChangeText={setEmail}
        placeholder="selam@example.com" keyboardType="email-address"
        autoCapitalize="none" placeholderTextColor="#9CA3AF" />

      <Text style={s.label}>Password</Text>
      <TextInput
        style={s.input} value={password} onChangeText={setPassword}
        placeholder="••••••••" secureTextEntry placeholderTextColor="#9CA3AF" />

      <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={s.link}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Web layout ───────────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <View style={ww.root}>
        <View style={ww.topBar}>
          <Text style={ww.topBarText}>🏥 MedLink Ethiopia</Text>
        </View>
        <View style={ww.centerWrap}>
          <View style={ww.card}>
            {formContent}
          </View>
        </View>
      </View>
    );
  }

  // ── Native layout ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {formContent}
      </View>
    </SafeAreaView>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  nativeInner: { padding: 24 },
  title:       { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub:         { fontSize: 15, color: '#6B7280', marginBottom: 28 },
  label:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 12 },
  input:       { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, color: '#111827' },
  btn:         { backgroundColor: TEAL, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:        { textAlign: 'center', color: TEAL, marginTop: 16, fontWeight: '600' },
});

// ── Web-only styles ───────────────────────────────────────────────────────────
const ww = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#F0F4F8' },
  topBar:     { backgroundColor: TEAL, height: 56, justifyContent: 'center', paddingHorizontal: 32 },
  topBarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:       { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 4, overflow: 'hidden' },
  formInner:  { padding: 40 },
});