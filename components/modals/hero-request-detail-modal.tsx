import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HeroRequestDetailModalProps {
  visible: boolean;
  request: ServiceRequest | null;
  onClose: () => void;
  onAccept?: (requestId: string) => void;
}

export function HeroRequestDetailModal({ 
  visible, 
  request, 
  onClose, 
  onAccept 
}: HeroRequestDetailModalProps) {
  const { user } = useAuthStore();
  const { acceptRequest } = useRequestsStore();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!request) return null;

  // ✅ UI GUARD: Determine if accept button should be shown
  const canAccept = request.status === 'pending' && !request.hero_id;
  const isAlreadyAssigned = request.status === 'assigned' || request.hero_id;

  const handleAccept = async () => {
    if (!user?.id || !request.id) return;

    // ✅ UI GUARD: Double-check status before accepting
    if (!canAccept) {
      setError('This request is no longer available');
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      // ✅ SCHEMA COMPLIANCE: Pass profiles.id (auth.uid()) to acceptRequest
      // Database layer will map to hero_profiles.id internally
      const result = await acceptRequest(request.id, user.id);
      
      if (result.success) {
        onAccept?.(request.id);
        onClose();
      } else {
        setError(result.error || 'Failed to accept request');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBudget = (budget: any) => {
    if (!budget || typeof budget !== 'object') return 'Budget not specified';
    const { min, max, currency = 'USD' } = budget;
    if (min === max) {
      return `$${min}`;
    }
    return `$${min} - $${max}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close request details modal"
          >
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Error Display */}
          {error && (
            <ErrorMessage 
              error={error} 
              onDismiss={() => setError(null)} 
            />
          )}

          {/* Request Info */}
          <View style={styles.section}>
            <Text style={styles.title}>{request.title}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{request.status.toUpperCase()}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{request.description}</Text>
          </View>

          {/* Details Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="pricetag-outline" size={20} color="#8E8E93" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{request.category}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color="#8E8E93" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{request.estimated_duration} hours</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={20} color="#8E8E93" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Budget</Text>
                  <Text style={styles.detailValue}>{formatBudget(request.budget_range)}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color="#8E8E93" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Scheduled</Text>
                  <Text style={styles.detailValue}>{formatDate(request.scheduled_date)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Location */}
          {request.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.locationCard}>
                <Ionicons name="location-outline" size={20} color="#007AFF" />
                <View style={styles.locationContent}>
                  <Text style={styles.locationText}>
                    {typeof request.location === 'object' 
                      ? `${request.location.address}, ${request.location.city}, ${request.location.state}`
                      : request.location
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {request.status === 'pending' && (
          <View style={styles.actions}>
            <Button
              title="Accept Request"
              onPress={handleAccept}
              loading={isAccepting}
              disabled={isAccepting}
              style={styles.acceptButton}
            />
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
  },
  detailsGrid: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  locationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationContent: {
    marginLeft: 12,
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  actions: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
});