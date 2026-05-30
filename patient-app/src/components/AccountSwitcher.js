
// ═══════════════════════════════════════════════════════════════════════════════
// components/AccountSwitcher.js
// ═══════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';

export function AccountSwitcher() {
  const { patientProfile, children, activeProfile, switchProfile } = useAuthStore();

  const all = [patientProfile, ...children].filter(Boolean);
  if (all.length <= 1) return null;

  return (
    <View style={sw.wrapper}>
      <Text style={sw.label}>Viewing:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sw.row}>
        {all.map(p => (
          <TouchableOpacity
            key={p.patientID}
            style={[sw.chip, activeProfile?.patientID === p.patientID && sw.chipActive]}
            onPress={() => switchProfile(p === patientProfile ? null : p)}>
            <Text style={[sw.chipText, activeProfile?.patientID === p.patientID && sw.chipTextActive]}>
              {p.isChild ? `👶 ${p.firstName}` : `👤 Me`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const sw = StyleSheet.create({
  wrapper:       { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6' },
  label:         { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  row:           { gap: 8, flexDirection: 'row' },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB' },
  chipActive:    { backgroundColor: '#0B6E6E', borderColor: '#0B6E6E' },
  chipText:      { fontSize: 13, color: '#374151' },
  chipTextActive:{ color: '#fff', fontWeight: '700' },
});
