import { RequestCard } from '@/components/cards/request-card';
import { HeroRequestDetailModal } from '@/components/modals/hero-request-detail-modal';
import { ErrorMessage } from '@/components/ui/error-message';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HeroRequestsScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { user } = useAuthStore();
  const { 
    activeRequests, 
    requestHistory, 
    loadRequests, 
    subscribeToRequests, 
    unsubscribeFromRequests, 
    isLoading, 
    error, 
    setError 
  } = useRequestsStore();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id || user.user_type !== 'hero') {
      router.replace('/(auth)/login');
      return;
    }

    const loadData = async () => {
      await loadRequests(user.id, 'hero');
      await subscribeToRequests(user.id, 'hero');
    };

    loadData();

    return () => {
      unsubscribeFromRequests();
    };
  }, [user?.id, user?.user_type, loadRequests, subscribeToRequests, unsubscribeFromRequests]);

  const heroRequests = useMemo(() => {
    const safeActive = Array.isArray(activeRequests) ? activeRequests : [];
    const safeHistory = Array.isArray(requestHistory) ? requestHistory : [];

    return [...safeActive, ...safeHistory].filter(
      (request) => request?.hero_id === user?.id
    );
  }, [activeRequests, requestHistory, user?.id]);

  useEffect(() => {
    if (!requestId) return;
    const matched = heroRequests.find((request) => request.id === requestId);
    if (matched) {
      setSelectedRequest(matched);
      setShowRequestModal(true);
    }
  }, [requestId, heroRequests]);

  const handleRequestPress = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const handleCloseModal = () => {
    setShowRequestModal(false);
    setSelectedRequest(null);
  };

  const onRefresh = async () => {
    if (!user?.id || refreshing) return;
    setRefreshing(true);
    await loadRequests(user.id, 'hero');
    setRefreshing(false);
  };

  if (isLoading && heroRequests.length === 0) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Your Requests</Text>
        <ListSkeleton count={3} type="request" />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Your Requests</Text>

      {error && (
        <ErrorMessage 
          error={error} 
          onDismiss={() => setError(null)} 
        />
      )}

      {heroRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Assigned Requests</Text>
          <Text style={styles.emptySubtitle}>
            Requests assigned to you will appear here.
          </Text>
        </View>
      ) : (
        heroRequests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onPress={() => handleRequestPress(request)}
          />
        ))
      )}

      <HeroRequestDetailModal
        visible={showRequestModal}
        request={selectedRequest}
        onClose={handleCloseModal}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
