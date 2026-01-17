/**
 * Offline indicator component
 * Displays a banner when the device is offline
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNetworkStatus } from '../../hooks/use-network-status';

export function OfflineIndicator() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>You're offline</Text>
      <Text style={styles.subtext}>Changes will sync when you reconnect</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
  },
});
