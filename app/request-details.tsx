import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function RequestDetailsScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeRequests, requestHistory, getRequestAcceptances } = useRequestsStore();
  const [acceptanceCount, setAcceptanceCount] = useState(0);
  const [isLoadingAcceptances, setIsLoadingAcceptances] = useState(false);

  const request = useMemo(() => {
    if (!requestId) return undefined;
    const safeActive = Array.isArray(activeRequests) ? activeRequests : [];
    const safeHistory = Array.isArray(requestHistory) ? requestHistory : [];
    return [...safeActive, ...safeHistory].find((item) => item.id === requestId);
  }, [requestId, activeRequests, requestHistory]);

  const isParticipant = !!request && !!user && (
    request.civilian_id === user.id || request.hero_id === user.id
  );
  const isCivilianOwner = !!request && !!user && user.user_type === 'civilian' && request.civilian_id === user.id;
  const canFetchAcceptances = !!request
    && isCivilianOwner
    && (request.status === 'pending' || request.status === 'open')
    && !request.hero_id;
  const canChooseHero = canFetchAcceptances && acceptanceCount > 0;

  useEffect(() => {
    let isActive = true;

    const loadAcceptances = async () => {
      if (!request || !canFetchAcceptances) {
        if (isActive) setAcceptanceCount(0);
        return;
      }

      setIsLoadingAcceptances(true);
      try {
        const result = await getRequestAcceptances(request.id);
        if (isActive) {
          setAcceptanceCount(result.success && result.data ? result.data.length : 0);
        }
      } catch (error) {
        if (isActive) setAcceptanceCount(0);
      } finally {
        if (isActive) setIsLoadingAcceptances(false);
      }
    };

    loadAcceptances();

    return () => {
      isActive = false;
    };
  }, [request?.id, request?.status, request?.hero_id, canFetchAcceptances, getRequestAcceptances]);

  return (
    <>
      <Stack.Screen options={{ title: 'Request Details' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {!requestId && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Missing Request</Text>
            <Text style={styles.emptySubtitle}>No request ID was provided.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {requestId && !request && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Request Not Found</Text>
            <Text style={styles.emptySubtitle}>We couldn&apos;t locate this request.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {request && !isParticipant && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Access Restricted</Text>
            <Text style={styles.emptySubtitle}>You don&apos;t have access to this request.</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.back()}>
              <Text style={styles.buttonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {request && isParticipant && (
          <View style={styles.card}>
            <Text style={styles.title}>{request.title}</Text>
            <Text style={styles.status}>{request.status.toUpperCase()}</Text>

            <Text style={styles.sectionTitle}>Category</Text>
            <Text style={styles.sectionValue}>{request.category}</Text>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.sectionValue}>{request.description}</Text>

            <Text style={styles.sectionTitle}>Scheduled</Text>
            <Text style={styles.sectionValue}>{new Date(request.scheduled_date).toLocaleString()}</Text>

            <Text style={styles.sectionTitle}>Duration</Text>
            <Text style={styles.sectionValue}>{request.estimated_duration} hour(s)</Text>

            <Text style={styles.sectionTitle}>Budget</Text>
            <Text style={styles.sectionValue}>
              ${request.budget_range.min} - ${request.budget_range.max}
            </Text>

            {request.location && (
              <>
                <Text style={styles.sectionTitle}>Location</Text>
                <Text style={styles.sectionValue}>
                  {typeof request.location === 'object'
                    ? `${request.location.address}, ${request.location.city}, ${request.location.state}`
                    : request.location}
                </Text>
              </>
            )}

            {canChooseHero && (
              <View style={styles.chooseHeroSection}>
                <View style={styles.chooseHeroHeader}>
                  <Text style={styles.chooseHeroTitle}>Choose Hero</Text>
                  <Text style={styles.chooseHeroSubtitle}>
                    {acceptanceCount} hero{acceptanceCount !== 1 ? 'es' : ''} accepted your request
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.chooseHeroButton, isLoadingAcceptances && styles.buttonDisabled]}
                  onPress={() => router.push({
                    pathname: '/(civilian)/choose-hero-acceptances',
                    params: { requestId: request.id },
                  })}
                  disabled={isLoadingAcceptances}
                >
                  <Text style={styles.chooseHeroButtonText}>
                    {isLoadingAcceptances ? 'Loading...' : `Choose Hero (${acceptanceCount})`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 12,
  },
  sectionValue: {
    fontSize: 16,
    color: '#1C1C1E',
    marginTop: 4,
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
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  chooseHeroSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  chooseHeroHeader: {
    marginBottom: 12,
  },
  chooseHeroTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chooseHeroSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  chooseHeroButton: {
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chooseHeroButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
