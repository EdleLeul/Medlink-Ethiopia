

// ═══════════════════════════════════════════════════════════════════════════════
// screens/access/AccessLogScreen.js
// ═══════════════════════════════════════════════════════════════════════════════
import { OfflineBanner } from '../../components/OfflineBanner';
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAccessLog } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { AccountSwitcher } from '../../components/AccountSwitcher';

export default function AccessLogScreen() {
  const activePatientID = useAuthStore(s => s.activePatientID());
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const res = await getAccessLog(activePatientID);
      setLogs(res.data.logs || []);
    } catch (e) {
      console.warn('Access log error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [activePatientID]);

  function fmt(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-ET', { dateStyle: 'medium', timeStyle: 'short' });
  }

  const ACTION_ICON  = { READ: 'eye-outline', WRITE: 'create-outline' };
  const ACTION_COLOR = { READ: '#3B82F6',     WRITE: '#10B981' };

  if (loading) return <ActivityIndicator size="large" color="#0B6E6E" style={{ marginTop: 60 }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <OfflineBanner />
      <View style={s.header}>
        <Text style={s.title}>Access Log</Text>
        <Text style={s.subtitle}>Every provider who has accessed your records</Text>
      </View>
      <AccountSwitcher />
      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="shield-checkmark-outline" size={52} color="#D1D5DB" />
            <Text style={s.emptyText}>No access events recorded yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.iconCol}>
              <Ionicons
                name={ACTION_ICON[item.action] || 'eye-outline'}
                size={22}
                color={ACTION_COLOR[item.action] || '#6B7280'}
              />
            </View>
            <View style={s.info}>
              <Text style={s.doctor}>
                {item.providerName ? `Dr. ${item.providerName}` : item.role}
              </Text>
              {item.facilityName && <Text style={s.facility}>{item.facilityName}</Text>}
              <Text style={s.recordType}>{item.recordType} · {item.action}</Text>
              <Text style={s.time}>{fmt(item.timestamp)}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { padding: 20, paddingBottom: 8 },
  title:      { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
  empty:      { alignItems: 'center', marginTop: 80 },
  emptyText:  { color: '#9CA3AF', marginTop: 12, fontSize: 15 },
  card:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1, gap: 12 },
  iconCol:    { justifyContent: 'center', alignItems: 'center', width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 10 },
  info:       { flex: 1 },
  doctor:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  facility:   { fontSize: 13, color: '#6B7280', marginTop: 1 },
  recordType: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
  time:       { fontSize: 11, color: '#D1D5DB', marginTop: 2 },
});