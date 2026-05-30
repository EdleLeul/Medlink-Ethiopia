import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TEAL  = '#0B6E6E';
const isWeb = Platform.OS === 'web';

export default function WelcomeScreen({ navigation }) {

  // ── Web version ─────────────────────────────────────────────────────────────
  if (isWeb) {
    return (
     <div style={{ backgroundColor: '#F0F4F8', minHeight: '100vh', overflowY: 'auto', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {/* Top bar */}
        <div style={{ backgroundColor: TEAL, height: 56, display: 'flex', alignItems: 'center', paddingLeft: 32 }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>🏥 MedLink Ethiopia</span>
        </div>

        {/* Centered card */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px 80px' }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
            padding: 40, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>

            {/* Icon */}
            <div style={{
              width: 96, height: 96, borderRadius: 48, backgroundColor: TEAL,
              display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24
            }}>
              <span style={{ fontSize: 42 }}>🏥</span>
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 12, marginTop: 0 }}>
              Your Health Records,<br />Everywhere You Go.
            </h2>

            <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              One secure ID connects your complete medical history across every
              healthcare facility in Ethiopia. Safe, private, and always accessible.
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
              {[
                'OTP-secured access',
                'Family accounts',
                'Full EMR history',
                'Find nearby hospitals'
              ].map(text => (
                <span key={text} style={{
                  backgroundColor: '#F0FDFA', border: '1px solid #CCFBF1',
                  borderRadius: 20, padding: '6px 14px', fontSize: 12,
                  color: TEAL, fontWeight: 600
                }}>{text}</span>
              ))}
            </div>

            {/* Buttons — using TouchableOpacity so navigation works */}
            <TouchableOpacity
              style={s.btnPrimary}
              onPress={() => navigation.navigate('Register')}>
              <Text style={s.btnPrimaryText}>Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => navigation.navigate('Login')}>
              <Text style={s.btnSecondaryText}>Sign In</Text>
            </TouchableOpacity>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>
              A patient-centred digital health platform built for Ethiopia
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Native (Android) version ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <View style={s.hero}>
        <Text style={s.logo}>🏥 MedLink</Text>
        <Text style={s.tagline}>Your health records,{'\n'}everywhere you go.</Text>
        <Text style={s.sub}>
          One secure ID connects your medical history across every facility in Ethiopia.
        </Text>
      </View>
      <View style={s.buttons}>
        <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('Register')}>
          <Text style={s.btnPrimaryText}>Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnSecondary} onPress={() => navigation.navigate('Login')}>
          <Text style={s.btnSecondaryText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: TEAL, justifyContent: 'space-between', padding: 32, paddingBottom: 48 },
  hero:             { flex: 1, justifyContent: 'center' },
  logo:             { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 16 },
  tagline:          { fontSize: 28, fontWeight: '700', color: '#fff', lineHeight: 36, marginBottom: 12 },
  sub:              { fontSize: 15, color: '#B2DFDB', lineHeight: 22 },
  buttons:          { gap: 12, paddingBottom: 16 },
  btnPrimary:       { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnPrimaryText:   { color: TEAL, fontWeight: '700', fontSize: 16 },
  btnSecondary:     { borderWidth: 2, borderColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});