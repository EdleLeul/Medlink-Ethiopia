// ═══════════════════════════════════════════════════════════════════════════════
// screens/children/ChildrenListScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
import { OfflineBanner } from '../../components/OfflineBanner';
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getChildren, deleteChild } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const TEAL = '#0B6E6E';

export default function ChildrenListScreen({ navigation }) {
  const { children, setChildren, switchProfile, patientProfile } = useAuthStore();
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await getChildren();
      setChildren(res.data.children || []);
    } catch (e) {
      console.warn(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function confirmDelete(child) {
    Alert.alert(
      'Remove Account',
      `Are you sure you want to remove ${child.firstName}'s account? Their records will be retained but the account will be deactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await deleteChild(child.patientID);
              setChildren(children.filter(c => c.patientID !== child.patientID));
              // If we were viewing that child, switch back to self
              switchProfile(null);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  }

  function ageFromDOB(dob) {
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }

  if (loading) return <ActivityIndicator size="large" color={TEAL} style={{ marginTop: 60 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <OfflineBanner />
      <View style={s.header}>
        <View>
          <Text style={s.title}>Family Accounts</Text>
          <Text style={s.subtitle}>Manage your children's health records</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => navigation.navigate('AddChild')}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={s.addBtnText}>Add Child</Text>
        </TouchableOpacity>
      </View>

      {/* Parent's own account card */}
      <TouchableOpacity
        style={[s.card, s.selfCard]}
        onPress={() => switchProfile(null)}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>👤</Text>
        </View>
        <View style={s.cardInfo}>
          <Text style={s.cardName}>{patientProfile?.firstName} {patientProfile?.lastName}</Text>
          <Text style={s.cardSub}>{patientProfile?.patientID}</Text>
          <Text style={s.cardTag}>Your Account</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={TEAL} />
      </TouchableOpacity>

      <FlatList
        data={children}
        keyExtractor={item => item.patientID}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="people-outline" size={52} color="#D1D5DB" />
            <Text style={s.emptyText}>No child accounts added yet</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('AddChild')}>
              <Text style={s.emptyBtnText}>Add a Child</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <TouchableOpacity
              style={s.cardMain}
              onPress={() => { switchProfile(item); navigation.navigate('Home'); }}>
              <View style={[s.avatar, { backgroundColor: '#FEF3C7' }]}>
                <Text style={s.avatarText}>👶</Text>
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{item.firstName} {item.lastName}</Text>
                <Text style={s.cardSub}>{item.patientID}</Text>
                <Text style={s.cardMeta}>
                  {item.sex} · Age {ageFromDOB(item.dateOfBirth)} · {item.relationship}
                </Text>
                {item.bloodType && (
                  <View style={s.bloodBadge}>
                    <Text style={s.bloodText}>{item.bloodType}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={s.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  title:       { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:    { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn:      { flexDirection: 'row', backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, alignItems: 'center', gap: 4 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', elevation: 1 },
  selfCard:    { marginHorizontal: 16, marginBottom: 4, borderColor: TEAL, borderWidth: 1.5 },
  cardMain:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { fontSize: 22 },
  cardInfo:    { flex: 1 },
  cardName:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSub:     { fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', marginTop: 1 },
  cardMeta:    { fontSize: 12, color: '#6B7280', marginTop: 3 },
  cardTag:     { fontSize: 11, color: TEAL, fontWeight: '700', marginTop: 3 },
  bloodBadge:  { alignSelf: 'flex-start', backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  bloodText:   { color: '#991B1B', fontSize: 11, fontWeight: '700' },
  deleteBtn:   { padding: 8 },
  empty:       { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText:   { color: '#9CA3AF', fontSize: 15, marginTop: 12, textAlign: 'center' },
  emptyBtn:    { marginTop: 16, backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:{ color: '#fff', fontWeight: '700' },
});
