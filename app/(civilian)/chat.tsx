import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ChatList } from '../../components/chat/chat-list';
import { useAuthStore } from '../../stores/auth';
import { useRequestsStore } from '../../stores/requests';

/**
 * CivilianChatScreen - Default export component for Expo Router
 * 
 * ✅ DEFAULT EXPORT: Required by Expo Router for proper route handling
 * ✅ ROLE VALIDATION: Ensures user role is defined before data operations
 * ✅ SAFE DATA ACCESS: Handles potentially undefined arrays gracefully
 */
export default function CivilianChatScreen() {
  const { user } = useAuthStore();
  const { activeRequests, requestHistory, loadRequests } = useRequestsStore();

  useEffect(() => {
    // ✅ ROLE VALIDATION: Ensure user ID and role are defined before querying
    // This prevents querying undefined data and ensures safe database operations
    if (!user?.id || !user?.user_type) {
      console.warn('User ID or user_type is undefined, skipping chat data load');
      return;
    }

    // ✅ ROLE ASSERTION: Only proceed if user is confirmed civilian
    if (user.user_type !== 'civilian') {
      console.warn('User is not civilian, chat data load may fail');
      return;
    }

    loadRequests(user.id, 'civilian');
  }, [user?.id, user?.user_type, loadRequests]);

  // ✅ SAFE DATA ACCESS: Filter requests with proper array handling
  // Ensure arrays are defined before spreading to prevent crashes
  const safeActiveRequests = Array.isArray(activeRequests) ? activeRequests : [];
  const safeRequestHistory = Array.isArray(requestHistory) ? requestHistory : [];
  
  const chatableRequests = [...safeActiveRequests, ...safeRequestHistory].filter(
    (request) => request?.hero_id && request?.status !== 'pending'
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4169E1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ChatList requests={chatableRequests} currentUserId={user.id} />
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