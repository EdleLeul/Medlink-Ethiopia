import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

export function PatientIDCard({ profile }) {
  if (!profile) return null;

  const {
    patientID, firstName, fatherName, grandfatherName,
    lastName, dateOfBirth, sex, bloodType, isChild, fanNumber
  } = profile;

  // Support both old (lastName) and new (fatherName) field names
  const displayFather      = fatherName  || lastName  || '';
  const displayGrandfather = grandfatherName || '';
  const fullName           = [firstName, displayFather, displayGrandfather]
    .filter(Boolean).join(' ');
  const shortName          = [firstName, displayFather].filter(Boolean).join(' ');

  return (
    <View style={s.card}>
      {/* Top row: photo + info + QR */}
      <View style={s.topRow}>

        {/* Photo placeholder */}
        <View style={s.photoBox}>
          <Ionicons name="person" size={36} color="rgba(255,255,255,0.6)" />
          <Text style={s.photoLabel}>ID Photo</Text>
        </View>

        {/* Name + ID */}
        <View style={s.nameBlock}>
          <Text style={s.name} numberOfLines={2}>{fullName}</Text>
          <Text style={s.id}>{patientID}</Text>
          {isChild && (
            <View style={s.childBadge}>
              <Text style={s.childBadgeText}>Child Account</Text>
            </View>
          )}
          {fanNumber && (
            <Text style={s.fan}>FAN: {fanNumber}</Text>
          )}
        </View>

        {/* QR Code */}
        <QRCode
          value={patientID}
          size={64}
          color="#fff"
          backgroundColor="transparent"
        />
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Bottom meta row */}
      <View style={s.meta}>
        <MetaItem label="DOB"        value={dateOfBirth} />
        <MetaItem label="Sex"        value={sex} />
        <MetaItem label="Blood Type" value={bloodType || '—'} />
      </View>
    </View>
  );
}

function MetaItem({ label, value }) {
  return (
    <View style={s.metaItem}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card:         { backgroundColor: '#0B6E6E', borderRadius: 18, padding: 18, margin: 16, elevation: 4 },
  topRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  photoBox:     { width: 72, height: 88, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', gap: 2 },
  photoLabel:   { fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  nameBlock:    { flex: 1 },
  name:         { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 20, marginBottom: 4 },
  id:           { fontSize: 11, color: '#B2DFDB', fontFamily: 'monospace', marginBottom: 4 },
  fan:          { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  childBadge:   { backgroundColor: '#FFB300', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
  childBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  divider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 12 },
  meta:         { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem:     { alignItems: 'center' },
  metaLabel:    { fontSize: 10, color: '#B2DFDB', marginBottom: 2 },
  metaValue:    { fontSize: 13, fontWeight: '700', color: '#fff' },
});

export default PatientIDCard;