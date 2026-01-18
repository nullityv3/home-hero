import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface RequestDetailModalProps {
  visible: boolean;
  request: ServiceRequest | null;
  onClose: () => void;
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: '#FF9500',
    icon: 'time-outline' as const,
  },
  assigned: {
    label: 'Assigned',
    color: '#007AFF',
    icon: 'person-outline' as const,
  },
  active: {
    label: 'Active',
    color: '#34C759',
    icon: 'checkmark-circle-outline' as const,
  },
  completed: {
    label: 'Completed',
    color: '#8E8E93',
    icon: 'checkmark-done-outline' as const,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#FF3B30',
    icon: 'close-circle-outline' as const,
  },
};

export function RequestDetailModal({ visible, request, onClose }: RequestDetailModalProps) {
  const { cancelRequest } = useRequestsStore();
  const [isCancelling, setIsCancelling] = useState(false);

  if (!request) return null;

  const statusConfig = STATUS_CONFIG[request.status];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancel = request.status === 'pending' || request.status === 'assigned' || request.status === 'active';
  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this service request? This action cannot be undone.',
      [
        {
          text: 'No, Keep It',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            const result = await cancelRequest(request.id);
            setIsCancelling(false);

            if (result.success) {
              Alert.alert(
                'Request Cancelled',
                request.hero_id 
                  ? 'The service request has been cancelled and the assigned hero has been notified.'
                  : 'The service request has been cancelled.',
                [{ text: 'OK', onPress: onClose }]
              );
            } else {
              Alert.alert(
                'Cancellation Failed',
                result.error || 'Failed to cancel the request. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
            <Ionicons name={statusConfig.icon} size={20} color="#fff" />
            <Text style={styles.statusText}>{statusConfig.label}</Text>
          </View>

          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.category}>{request.category}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionContent}>{request.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoText}>{formatDate(request.scheduled_date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#8E8E93" />
              <Text style={styles.infoText}>{request.estimated_duration} hour(s)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color="#8E8E93" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoText}>{request.location.address}</Text>
                <Text style={styles.infoSubtext}>
                  {request.location.city}, {request.location.state} {request.location.zipCode}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <Text style={styles.budgetText}>
              ${request.budget_range.min} - ${request.budget_range.max} {request.budget_range.currency}
            </Text>
          </View>

          {request.hero_id && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hero Assignment</Text>
              <View style={styles.heroCard}>
                <Ionicons name="person-circle-outline" size={40} color="#007AFF" />
                <View style={styles.heroInfo}>
                  <Text style={styles.heroText}>Hero Assigned</Text>
                  <Text style={styles.heroSubtext}>ID: {request.hero_id.substring(0, 8)}...</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Information</Text>
            <Text style={styles.infoSubtext}>
              Created: {formatDate(request.created_at)}
            </Text>
            <Text style={styles.infoSubtext}>
              Last Updated: {formatDate(request.updated_at)}
            </Text>
          </View>
        </ScrollView>

        {canCancel && (
          <View style={styles.footer}>
            {canCancel && (
              <TouchableOpacity
                style={[styles.cancelButton, isCancelling && styles.buttonDisabled]}
                onPress={handleCancelRequest}
                disabled={isCancelling}
              >
                <Ionicons name="close-circle-outline" size={20} color="#fff" />
                <Text style={styles.cancelButtonText}>
                  {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  category: {
    fontSize: 16,
    color: '#8E8E93',
    textTransform: 'capitalize',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 16,
    color: '#000',
  },
  infoSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  budgetText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroInfo: {
    flex: 1,
  },
  heroText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  heroSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
