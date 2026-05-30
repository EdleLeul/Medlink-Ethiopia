import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

/**
 * OfflineBanner — shows a yellow bar when the device has no internet.
 * Shows the date the cached data was last updated if provided.
 *
 * Usage:
 *   import { OfflineBanner } from '../../components/OfflineBanner';
 *
 *   // At top of any screen's return:
 *   <OfflineBanner savedAt={savedAt} />
 *
 * Props:
 *   savedAt {string|null} — ISO date string of when cache was last saved
 *   isCache {boolean}     — force show even if online (when serving cached data)
 */
export function OfflineBanner({ savedAt, isCache }) {
  const [isOffline, setIsOffline]   = useState(false);
  const [opacity]                   = useState(new Animated.Value(0));

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsub();
  }, []);

  const show = isOffline || isCache;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue:         show ? 1 : 0,
      duration:        300,
      useNativeDriver: true,
    }).start();
  }, [show]);

  if (!show) return null;

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Animated.View style={[s.banner, { opacity }]}>
      <Ionicons name="cloud-offline-outline" size={14} color="#92400E" />
      <Text style={s.text}>
        {isOffline ? 'You\'re offline' : 'Cached data'}
        {savedAt ? ` — last updated ${formatDate(savedAt)}` : ''}
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: 16,
    paddingVertical:   8,
  },
  text: {
    fontSize:   12,
    color:      '#92400E',
    fontWeight: '600',
    flex:       1,
  },
});

export default OfflineBanner;