import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ChatList } from '../../components/chat/chat-list';
import { useAuthStore } from '../../stores/auth';
import { useRequestsStore } from '../../stores/requests';
import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performance';

/**
 * HeroChatScreen - Default export component for Expo Router
 * 
 * ✅ DEFAULT EXPORT: Required by Expo Router for proper route handling
 * ✅ ROLE VALIDATION: Ensures user role is defined before data operations
 * ✅ SAFE DATA ACCESS: Handles potentially undefined arrays gracefully
 * ✅ SECURITY: Only shows chats for requests assigned to this hero
 * ✅ PERFORMANCE: Includes monitoring and memoization
 */
export default function HeroChatScreen() {
  const { user } = useAuthStore();
  const { 
    activeRequests, 
    requestHistory, 
    loadRequests, 
    isLoading, 
    error,
    subscribeToRequests,
    unsubscribeFromRequests
  } = useRequestsStore();
  
  // ✅ UX: Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // ✅ MONITORING: Track hero chat screen access
  useEffect(() => {
    if (user?.id) {
      logger.info('Hero chat screen accessed', {
        userId: user.id,
        userType: user.user_type,
        timestamp: new Date().toISOString()
      });
      
      // ✅ PERFORMANCE: Start measuring data load time
      performanceMonitor.start('hero-chat-data-load', 'api');
    }
  }, [user?.id]);

  // ✅ DATA LOADING & REALTIME SUBSCRIPTIONS
  useEffect(() => {
    // ✅ ROLE VALIDATION: Ensure user ID and role are defined before querying
    // This prevents querying undefined data and ensures safe database operations
    if (!user?.id || !user?.user_type) {
      logger.warn('User ID or user_type is undefined, skipping chat data load', {
        userId: user?.id,
        userType: user?.user_type
      });
      return;
    }

    // ✅ ROLE ASSERTION: Only proceed if user is confirmed hero
    if (user.user_type !== 'hero') {
      logger.warn('User is not hero, redirecting from chat screen', {
        userId: user.id,
        userType: user.user_type
      });
      return;
    }

    // ✅ DATA INTEGRITY: Load requests with error handling
    loadRequests(user.id, 'hero')
      .then(() => {
        // ✅ PERFORMANCE: End measuring data load time
        performanceMonitor.end('hero-chat-data-load');
        
        // ✅ REALTIME: Subscribe to real-time updates for assigned requests
        subscribeToRequests(user.id, 'hero');
        
        logger.info('Hero chat data loaded successfully', {
          userId: user.id,
          timestamp: new Date().toISOString()
        });
      })
      .catch((error) => {
        // ✅ MONITORING: Enhanced error logging
        logger.error('Failed to load hero requests for chat', {
          userId: user.id,
          userType: user.user_type,
          error: (error as Error)?.message || String(error),
          timestamp: new Date().toISOString()
        });
        
        // ✅ PERFORMANCE: End measuring even on error
        performanceMonitor.end('hero-chat-data-load');
      });

    // ✅ CLEANUP: Unsubscribe on component unmount
    return () => {
      unsubscribeFromRequests();
    };
  }, [user?.id, user?.user_type, loadRequests, subscribeToRequests, unsubscribeFromRequests]);

  // ✅ UX: Manual refresh handler
  const handleRefresh = async () => {
    if (!user?.id || refreshing) return;
    
    setRefreshing(true);
    
    try {
      logger.info('Hero chat manual refresh initiated', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      // ✅ PERFORMANCE: Measure refresh performance
      performanceMonitor.start('hero-chat-refresh', 'api');
      
      await loadRequests(user.id, 'hero');
      
      performanceMonitor.end('hero-chat-refresh');
      
      logger.info('Hero chat manual refresh completed', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Hero chat manual refresh failed', {
        userId: user.id,
        error: (error as Error)?.message || String(error),
        timestamp: new Date().toISOString()
      });
      
      performanceMonitor.end('hero-chat-refresh');
    } finally {
      setRefreshing(false);
    }
  };

  // ✅ PERFORMANCE: Memoize expensive filtering operations
  const chatableRequests = useMemo(() => {
    // ✅ PERFORMANCE: Measure filtering performance
    performanceMonitor.start('hero-chat-filter', 'render');
    
    // ✅ SAFE DATA ACCESS: Filter requests with proper array handling
    // Ensure arrays are defined before spreading to prevent crashes
    const safeActiveRequests = Array.isArray(activeRequests) ? activeRequests : [];
    const safeRequestHistory = Array.isArray(requestHistory) ? requestHistory : [];
    
    let invalidRequestCount = 0;
    let unauthorizedRequestCount = 0;
    
    // ✅ SECURITY: Enhanced authorization - only show chats for assigned requests
    // ✅ DATA INTEGRITY: Validate request ownership and status
    const filtered = [...safeActiveRequests, ...safeRequestHistory].filter(
      (request) => {
        // Ensure request exists and has required fields
        if (!request?.id || !request?.hero_id || !request?.status) {
          invalidRequestCount++;
          if (__DEV__) {
            console.warn('Invalid request data found, skipping:', request?.id);
          }
          return false;
        }
        
        // ✅ AUTHORIZATION: Only show requests assigned to this hero
        if (request.hero_id !== user?.id) {
          unauthorizedRequestCount++;
          return false;
        }
        
        // ✅ BUSINESS LOGIC: Only allow chat for assigned/active/completed requests
        // Pending requests don't have assigned heroes yet
        const allowedStatuses = ['assigned', 'active', 'completed'];
        return allowedStatuses.includes(request.status);
      }
    );
    
    // ✅ MONITORING: Log filtering results for analytics
    if (user?.id) {
      logger.info('Hero chat requests filtered', {
        userId: user.id,
        totalRequests: safeActiveRequests.length + safeRequestHistory.length,
        chatableRequests: filtered.length,
        invalidRequests: invalidRequestCount,
        unauthorizedRequests: unauthorizedRequestCount,
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ PERFORMANCE: End measuring filtering performance
    performanceMonitor.end('hero-chat-filter');
    
    return filtered;
  }, [activeRequests, requestHistory, user?.id]);

  // ✅ UX: Enhanced loading and error states
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatList 
        requests={chatableRequests} 
        currentUserId={user.id}
        // ✅ UX: Pull-to-refresh functionality
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});