import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestCard } from '@/components/cards/request-card';
import { RequestDetailModal } from '@/components/modals/request-detail-modal';
import { ListSkeleton } from '@/components/ui/loading-skeleton';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { ServiceRequest } from '@/types';

type TabType = 'active' | 'history';

export default function CivilianRequestsScreen() {
  const { user } = useAuthStore();
  const { activeRequests, requestHistory, loadRequests, isLoading, subscribeToRequests, unsubscribeFromRequests, getRequestAcceptances } = useRequestsStore();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [acceptanceCounts, setAcceptanceCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user?.id) return;

    loadRequests(user.id, 'civilian');
    subscribeToRequests(user.id, 'civilian');

    return () => {
      unsubscribeFromRequests();
    };
  }, [user?.id]);

  // Load acceptance counts for pending requests
  useEffect(() => {
    const loadAcceptanceCounts = async () => {
      const pendingRequests = activeRequests.filter(req => req.status === 'pending');
      const counts: Record<string, number> = {};
      
      for (const request of pendingRequests) {
        try {
          const result = await getRequestAcceptances(request.id);
          if (result.success && result.data) {
            counts[request.id] = result.data.length;
          }
        } catch (error) {
          console.warn('Failed to load acceptances for request:', request.id);
        }
      }
      
      setAcceptanceCounts(counts);
    };

    if (activeRequests.length > 0) {
      loadAcceptanceCounts();
    }
  }, [activeRequests]);

  const onRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await loadRequests(user.id, 'civilian');
      setRefreshing(false);
    }
  };

  const handleRequestPress = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRequest(null);
  };

  const sortRequests = (requests: ServiceRequest[]) => {
    // Ensure requests is always an array
    const safeRequests = requests || [];
    
    if (sortBy === 'date') {
      return [...safeRequests].sort((a, b) => 
        new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      );
    } else {
      // Sort by status priority: active > assigned > pending
      const statusPriority = { active: 3, assigned: 2, pending: 1, completed: 0, cancelled: 0 };
      return [...safeRequests].sort((a, b) => 
        statusPriority[b.status] - statusPriority[a.status]
      );
    }
  };

  const filterRequests = (requests: ServiceRequest[]) => {
    return sortRequests(requests);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'active' ? 'document-text-outline' : 'time-outline'} 
        size={64} 
        color="#C7C7CC" 
      />
      <Text style={styles.emptyTitle}>
        {activeTab === 'active' ? 'No Active Requests' : 'No Request History'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'active' 
          ? 'Create a new service request to get started'
          : 'Your completed and cancelled requests will appear here'}
      </Text>
      {activeTab === 'active' && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-request')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({(activeRequests || []).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History ({(requestHistory || []).length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'date' ? 'status' : 'date')}
        >
          <Ionicons name="funnel-outline" size={20} color="#007AFF" />
          <Text style={styles.sortText}>
            Sort by {sortBy === 'date' ? 'Date' : 'Status'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Safely handle potentially undefined arrays
  const safeActiveRequests = activeRequests || [];
  const safeRequestHistory = requestHistory || [];
  const currentRequests = activeTab === 'active' ? safeActiveRequests : safeRequestHistory;
  const filteredRequests = filterRequests(currentRequests);

  if (isLoading && !refreshing && currentRequests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>My Requests</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/create-request')}
          >
            <Ionicons name="add-circle" size={28} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {renderHeader()}
        <ListSkeleton count={4} type="request" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>My Requests</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/create-request')}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard 
            request={item} 
            onPress={() => handleRequestPress(item)}
            showChooseHero={item.status === 'pending' && !item.hero_id}
            acceptanceCount={acceptanceCounts[item.id] || 0}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <RequestDetailModal
        visible={modalVisible}
        request={selectedRequest}
        onClose={handleCloseModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  sortText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});