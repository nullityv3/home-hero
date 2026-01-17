import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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

interface HeroAcceptance {
  id: string;
  request_id: string;
  profileId: string;
  accepted_at: string;
  chosen: boolean;
  hero: {
    profileId: string;
    fullName: string;
    phone: string;
    skills: string[];
    hourlyRate: number;
    rating: number;
    completedJobs: number;
    profileImageUrl: string | null;
  };
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
  const { user } = useAuthStore();
  const { cancelRequest, getRequestAcceptances, chooseHero } = useRequestsStore();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showHeroSelection, setShowHeroSelection] = useState(false);
  const [acceptances, setAcceptances] = useState<HeroAcceptance[]>([]);
  const [isLoadingAcceptances, setIsLoadingAcceptances] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);

  // Load acceptances when modal opens and request is pending
  useEffect(() => {
    if (visible && request && (request.status === 'pending' || request.status === 'open') && !request.hero_id) {
      loadAcceptances();
    }
  }, [visible, request?.id, request?.status]);

  const loadAcceptances = async () => {
    if (!request) return;
    
    setIsLoadingAcceptances(true);
    try {
      const result = await getRequestAcceptances(request.id);
      if (result.success && result.data) {
        setAcceptances(result.data as HeroAcceptance[]);
      }
    } catch (error) {
      console.error('Failed to load acceptances:', error);
    } finally {
      setIsLoadingAcceptances(false);
    }
  };

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
  const canChooseHero = (request.status === 'pending' || request.status === 'open') && !request.hero_id && acceptances.length > 0;

  const handleChooseHeroPress = () => {
    setShowHeroSelection(true);
  };

  const handleHeroSelect = async (profileId: string, heroName: string) => {
    if (!user?.id || !request) return;

    Alert.alert(
      'Choose Hero',
      `Are you sure you want to choose ${heroName} for this request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose',
          style: 'default',
          onPress: async () => {
            setIsChoosing(true);
            try {
              const result = await chooseHero(request.id, profileId, user.id);
              if (result.success) {
                Alert.alert(
                  'Hero Chosen!',
                  `${heroName} has been assigned to your request.`,
                  [{ text: 'OK', onPress: () => {
                    setShowHeroSelection(false);
                    onClose();
                  }}]
                );
              } else {
                Alert.alert('Error', result.error || 'Failed to choose hero');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            } finally {
              setIsChoosing(false);
            }
          },
        },
      ]
    );
  };

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

        {(canChooseHero || canCancel) && (
          <View style={styles.footer}>
            {canChooseHero && (
              <TouchableOpacity
                style={[styles.chooseHeroButton, isLoadingAcceptances && styles.buttonDisabled]}
                onPress={handleChooseHeroPress}
                disabled={isLoadingAcceptances}
              >
                <Ionicons name="people-outline" size={20} color="#fff" />
                <Text style={styles.chooseHeroButtonText}>
                  {isLoadingAcceptances ? 'Loading...' : `Choose Hero (${acceptances.length})`}
                </Text>
              </TouchableOpacity>
            )}
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

      {/* Hero Selection Modal */}
      <Modal
        visible={showHeroSelection}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHeroSelection(false)}
      >
        <View style={styles.heroSelectionContainer}>
          <View style={styles.heroSelectionHeader}>
            <TouchableOpacity 
              onPress={() => setShowHeroSelection(false)} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.heroSelectionTitle}>Choose Your Hero</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.heroSelectionContent} showsVerticalScrollIndicator={false}>
            {acceptances.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>No Heroes Yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Heroes who accept your request will appear here
                </Text>
              </View>
            ) : (
              acceptances.map((acceptance) => (
                <View key={acceptance.id} style={styles.heroCard}>
                  <View style={styles.heroHeader}>
                    <View style={styles.heroImageContainer}>
                      {acceptance.hero.profileImageUrl ? (
                        <Image
                          source={{ uri: acceptance.hero.profileImageUrl }}
                          style={styles.heroImage}
                        />
                      ) : (
                        <View style={styles.heroImagePlaceholder}>
                          <Ionicons name="person" size={32} color="#8E8E93" />
                        </View>
                      )}
                    </View>
                    <View style={styles.heroInfo}>
                      <Text style={styles.heroName}>{acceptance.hero.fullName}</Text>
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.rating}>{acceptance.hero.rating.toFixed(1)}</Text>
                        <Text style={styles.jobsCount}>({acceptance.hero.completedJobs} jobs)</Text>
                      </View>
                      <Text style={styles.hourlyRate}>${acceptance.hero.hourlyRate}/hour</Text>
                    </View>
                  </View>

                  {acceptance.hero.skills && acceptance.hero.skills.length > 0 && (
                    <View style={styles.skillsContainer}>
                      <Text style={styles.skillsTitle}>Skills:</Text>
                      <View style={styles.skillsWrapper}>
                        {acceptance.hero.skills.slice(0, 3).map((skill, index) => (
                          <View key={index} style={styles.skillBadge}>
                            <Text style={styles.skillText}>{skill}</Text>
                          </View>
                        ))}
                        {acceptance.hero.skills.length > 3 && (
                          <Text style={styles.moreSkills}>+{acceptance.hero.skills.length - 3} more</Text>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={styles.acceptanceInfo}>
                    <Ionicons name="time-outline" size={16} color="#8E8E93" />
                    <Text style={styles.acceptanceTime}>
                      Accepted {new Date(acceptance.accepted_at).toLocaleDateString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.selectHeroButton, isChoosing && styles.buttonDisabled]}
                    onPress={() => handleHeroSelect(acceptance.profileId, acceptance.hero.fullName)}
                    disabled={isChoosing}
                  >
                    {isChoosing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.selectHeroButtonText}>Choose This Hero</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  chooseHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  chooseHeroButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  // Hero Selection Modal Styles
  heroSelectionContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  heroSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  heroSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  heroSelectionContent: {
    flex: 1,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroImageContainer: {
    marginRight: 12,
  },
  heroImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  heroImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
  },
  jobsCount: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  hourlyRate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  skillsContainer: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  skillsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: '#1976D2',
  },
  moreSkills: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  acceptanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  acceptanceTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 4,
  },
  selectHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectHeroButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    marginTop: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});
