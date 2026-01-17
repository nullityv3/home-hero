import { useRouter } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ServiceRequest } from '../../types';
import { logger } from '../../utils/logger';

interface ChatListProps {
  requests: ServiceRequest[];
  currentUserId: string;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  unreadCounts?: Record<string, number>; // requestId -> unread count
}

export const ChatList = memo(function ChatList({ 
  requests = [], 
  currentUserId, 
  isLoading = false,
  error = null,
  onRefresh,
  refreshing = false,
  unreadCounts = {}
}: ChatListProps) {
  const router = useRouter();

  // Validate currentUserId
  if (!currentUserId || typeof currentUserId !== 'string') {
    logger.error('ChatList: Invalid currentUserId provided');
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Invalid user session</Text>
        <Text style={styles.errorMessage}>Please log in again</Text>
      </View>
    );
  }

  // Filter and validate requests for security
  const validRequests = useMemo(() => {
    return requests.filter(request => {
      // Validate request structure
      if (!request || !request.id || !request.title || !request.status) {
        logger.warn('ChatList: Invalid request structure', { requestId: request?.id });
        return false;
      }

      // Security: Only show requests where user is participant
      const isParticipant = request.civilian_id === currentUserId || request.hero_id === currentUserId;
      if (!isParticipant) {
        logger.warn('ChatList: Unauthorized request access attempt', { 
          requestId: request.id, 
          userId: currentUserId 
        });
        return false;
      }

      return true;
    });
  }, [requests, currentUserId]);

  const handleChatPress = useCallback((request: ServiceRequest) => {
    try {
      // Additional security check
      if (!request?.id) {
        logger.error('ChatList: Invalid request for navigation');
        return;
      }

      // Verify user has access to this conversation
      if (request.civilian_id !== currentUserId && request.hero_id !== currentUserId) {
        logger.error('ChatList: Unauthorized access attempt', { 
          requestId: request.id, 
          userId: currentUserId 
        });
        return;
      }

      // Rate limiting: Prevent rapid navigation spam
      const now = Date.now();
      const lastNavigation = handleChatPress.lastNavigation || 0;
      if (now - lastNavigation < 1000) { // 1 second cooldown
        logger.warn('ChatList: Navigation rate limited', { requestId: request.id });
        return;
      }
      handleChatPress.lastNavigation = now;

      // Haptic feedback for better UX
      if (process.env.EXPO_OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Log user action for analytics
      logger.info('Chat conversation opened', {
        requestId: request.id,
        requestStatus: request.status,
        userRole: request.civilian_id === currentUserId ? 'civilian' : 'hero'
      });

      router.push({
        pathname: '/chat-conversation',
        params: { requestId: request.id },
      });
    } catch (error) {
      logger.error('Navigation error in ChatList', error);
    }
  }, [router, currentUserId]);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'assigned':
        return '#4169E1';
      case 'active':
        return '#32CD32';
      case 'completed':
        return '#808080';
      case 'cancelled':
        return '#DC143C';
      default:
        return '#808080';
    }
  }, []);

  const renderChatItem = useCallback(({ item }: { item: ServiceRequest }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => handleChatPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Chat for ${item.title}`}
        accessibilityHint={`Opens conversation about ${item.category} request`}
        accessibilityState={{ disabled: false }}
      >
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.chatCategory}>
            {item.category}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.chatDate}>
            {formatDate(item.scheduled_date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [getStatusColor, handleChatPress, formatDate]);

  const keyExtractor = useCallback((item: ServiceRequest) => item.id, []);

  // Show error state
  if (error) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load conversations</Text>
        <Text style={styles.errorMessage}>
          {error.includes('network') || error.includes('fetch') 
            ? 'Please check your internet connection and try again'
            : error
          }
        </Text>
        {onRefresh && (
          <TouchableOpacity 
            onPress={() => {
              if (process.env.EXPO_OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              onRefresh();
            }} 
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry loading conversations"
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Show loading state
  if (isLoading && validRequests.length === 0) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  // Show empty state
  if (validRequests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation when you have active requests
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={validRequests}
      renderItem={renderChatItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContainer}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4169E1']} // Android
            tintColor="#4169E1" // iOS
            title="Pull to refresh" // iOS
            titleColor="#666" // iOS
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  chatItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  chatCategory: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chatDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC143C',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});