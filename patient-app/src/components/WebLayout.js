import React from 'react';
import { View, ScrollView, StyleSheet, Platform, Dimensions } from 'react-native';

const TEAL = '#0B6E6E';

/**
 * WebLayout wraps screens in a centered, max-width card on web.
 * On native (Android/iOS) it renders children directly with no wrapper.
 */
export function WebLayout({ children, scroll = true, style }) {
  if (Platform.OS !== 'web') {
    // On native, just render children as-is
    return <>{children}</>;
  }

  const content = (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );

  if (scroll) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.topBar}>
          <View style={styles.logo}>
            {/* Simple text logo for web header */}
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.webRoot}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    minHeight: '100vh',
  },
  topBar: {
    backgroundColor: '#0B6E6E',
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
});