import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RequestStatus } from '../../types';

interface StatusIndicatorProps {
  status: RequestStatus;
  timestamp?: string;
}

export function StatusIndicator({ status, timestamp }: StatusIndicatorProps) {
  const statusInfo = getStatusInfo(status);

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={[styles.badge, { backgroundColor: statusInfo.color }]}>
        <Text style={styles.badgeText}>{statusInfo.icon}</Text>
      </View>
      <View style={styles.line} />
      <View style={styles.messageContainer}>
        <Text style={styles.statusText}>{statusInfo.message}</Text>
        {timestamp && (
          <Text style={styles.timestamp}>
            {new Date(timestamp).toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
}

function getStatusInfo(status: RequestStatus): {
  message: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case 'pending':
      return {
        message: 'Request is pending',
        color: '#FFA500',
        icon: '⏳',
      };
    case 'assigned':
      return {
        message: 'Hero assigned to request',
        color: '#4169E1',
        icon: '✓',
      };
    case 'active':
      return {
        message: 'Request is now active',
        color: '#32CD32',
        icon: '▶',
      };
    case 'completed':
      return {
        message: 'Request completed',
        color: '#808080',
        icon: '✓✓',
      };
    case 'cancelled':
      return {
        message: 'Request cancelled',
        color: '#DC143C',
        icon: '✕',
      };
    default:
      return {
        message: 'Status updated',
        color: '#808080',
        icon: '•',
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  badgeText: {
    fontSize: 16,
    color: '#fff',
  },
  messageContainer: {
    flex: 2,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});
