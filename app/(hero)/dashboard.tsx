import { RequestCard } from '@/components/cards/request-card';
import { HeroRequestDetailModal } from '@/components/modals/hero-request-detail-modal';
import { ErrorMessage } from '@/components/ui/error-message';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';
import { performanceMonitor } from '@/utils/performance';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HeroDashboardScreen() {
  const { user } = useAuthStore();
  const { activeRequests, availableRequests, loadRequests, subscribeToRequests, unsubscribeFromRequests, isLoading, error, setError } = useRequestsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Authorization check - moved after all hooks
  useEffect(() => {
    if (!user?.id || user.user_type !== 'hero') {
      router.replace('/(auth)/login');
      return;
    }

    // Only proceed with data loading if user is authorized
    const loadData = async () => {
      try {
        // ✅ MONITORING: Track dashboard load performance with safe fallback
        // Safe check: performanceMonitor may be undefined in some environments
        if (performanceMonitor?.measureAsync) {
          await performanceMonitor.measureAsync(
            'hero_dashboard_load',
            async () => {
              await loadRequests(user.id, 'hero');
              await subscribeToRequests(user.id, 'hero');
            },
            'render'
          );
        } else {
          // Fallback: execute without performance monitoring
          await loadRequests(user.id, 'hero');
          await subscribeToRequests(user.id, 'hero');
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      }
    };

    loadData();

    return () => {
      unsubscribeFromRequests();
    };
  }, [user?.id, user?.user_type]);

  // ✅ PERFORMANCE: Prevent duplicate refresh calls
  const onRefresh = useCallback(async () => {
    if (!user?.id || user.user_type !== 'hero') {
      setError('Please log in again to refresh your dashboard.');
      return;
    }

    // Prevent multiple simultaneous refresh calls
    if (refreshing) {
      return;
    }

    try {
      setRefreshing(true);
      setError(null); // Clear any existing errors
      await loadRequests(user.id, 'hero');
    } catch (error) {
      setError('Failed to refresh dashboard. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, user?.user_type, refreshing, loadRequests]);

  const handleRequestPress = (request: ServiceRequest) => {
    // ✅ DATA INTEGRITY: Validate request object
    if (!request || !request.id) {
      setError('Invalid request data. Please refresh and try again.');
      return;
    }

    // ✅ SECURITY: Validate request status
    const validStatuses = ['pending', 'assigned', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(request.status)) {
      setError('Invalid request status. Please refresh and try again.');
      return;
    }

    if (request.status === 'pending') {
      // Show modal for pending requests (available to accept)
      setSelectedRequest(request);
      setShowRequestModal(true);
    } else {
      // Navigate to request details for assigned/active requests
      router.push({
        pathname: '/(hero)/requests',
        params: { requestId: request.id },
      });
    }
  };

  // ✅ PERFORMANCE: Memoize callback to prevent unnecessary re-renders
  const handleAcceptRequest = useCallback((requestId: string) => {
    // Refresh the requests after acceptance
    if (user?.id) {
      loadRequests(user.id, 'hero');
    }
  }, [user?.id, loadRequests]);

  // ✅ PERFORMANCE: Memoize callback to prevent unnecessary re-renders
  const handleCloseModal = useCallback(() => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  }, []);

  // ✅ PERFORMANCE: Memoize expensive filtering operations
  const assignedRequests = useMemo(() => {
    return Array.isArray(activeRequests) 
      ? activeRequests.filter(req => req && req.status === 'assigned' && req.hero_id === user?.id)
      : [];
  }, [activeRequests, user?.id]);

  const activeJobs = useMemo(() => {
    return Array.isArray(activeRequests)
      ? activeRequests.filter(req => req && req.status === 'active' && req.hero_id === user?.id)
      : [];
  }, [activeRequests, user?.id]);

  // Show loading state after all hooks are processed
  if (isLoading && !refreshing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.subtitle}>Loading your requests...</Text>
        </View>

        {/* Requests Skeleton */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Requests</Text>
          <ListSkeleton count={3} type="request" />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Active Jobs</Text>
          <ListSkeleton count={2} type="request" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          accessibilityLabel="Pull to refresh dashboard"
        />
      }
      accessibilityRole="scrollbar"
      accessibilityLabel="Hero dashboard content"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Find and manage your jobs</Text>
      </View>

      {/* Error Display */}
      {error && (
        <ErrorMessage 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      {/* Available Requests Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Requests</Text>
          {Array.isArray(availableRequests) && availableRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{availableRequests.length}</Text>
            </View>
          )}
        </View>

        {!Array.isArray(availableRequests) || availableRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No available requests</Text>
            <Text style={styles.emptyStateSubtext}>New job requests will appear here</Text>
          </View>
        ) : (
          availableRequests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => handleRequestPress(request)}
            />
          ))
        )}
      </View>

      {/* Assigned Requests Section */}
      {assignedRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Assigned to You</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{assignedRequests.length}</Text>
            </View>
          </View>

          {assignedRequests.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => handleRequestPress(request)}
            />
          ))}
        </View>
      )}

      {/* Active Jobs Section */}
      {activeJobs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Jobs</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeJobs.length}</Text>
            </View>
          </View>

          {activeJobs.map(request => (
            <RequestCard
              key={request.id}
              request={request}
              onPress={() => handleRequestPress(request)}
            />
          ))}
        </View>
      )}

      {/* Request Detail Modal */}
      <HeroRequestDetailModal
        visible={showRequestModal}
        request={selectedRequest}
        onClose={handleCloseModal}
        onAccept={handleAcceptRequest}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
});