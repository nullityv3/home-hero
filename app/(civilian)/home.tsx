import { ProtectedRoute } from '@/components/auth/protected-route';
import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui/button';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useAuthStore } from '@/stores/auth';
import { useRequestsStore } from '@/stores/requests';
import { useUserStore } from '@/stores/user';
import { performanceMonitor } from '@/utils/performance';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

/**
 * CivilianHomeContent - Main dashboard content for civilian users
 * 
 * ✅ ROLE VALIDATION: Ensures user role is defined before querying role-specific tables
 * ✅ SAFE DATA ACCESS: Provides defaults for potentially undefined arrays
 * ✅ PERFORMANCE MONITORING: Optional tracking with safe fallbacks
 */
function CivilianHomeContent() {
  const { user } = useAuthStore();
  const { profile, civilianProfile, isLoading: profileLoading, loadUserProfile } = useUserStore();
  const { activeRequests, isLoading: requestsLoading, loadRequests } = useRequestsStore();

  // ✅ ROLE VALIDATION: Load user data with proper role checking
  useEffect(() => {
    // ✅ ROLE ASSERTION: Ensure user ID and role are defined before querying
    // This prevents querying undefined_profiles and ensures safe database operations
    if (!user?.id || !user?.user_type) {
      console.warn('User ID or user_type is undefined, skipping data load');
      return;
    }

    // ✅ ROLE CHECK: Only proceed if user is confirmed civilian
    if (user.user_type !== 'civilian') {
      console.warn('User is not civilian, data load may fail');
      return;
    }

    const loadData = async () => {
      try {
        await Promise.all([
          loadUserProfile(user.id, 'civilian'),
          loadRequests(user.id, 'civilian')
        ]);
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Error is handled by individual stores
      }
    };
    loadData();
  }, [user?.id, user?.user_type, loadUserProfile, loadRequests]);

  // Safely calculate active requests count with default empty array
  const activeRequestsCount = (activeRequests || []).length;

  const handleCreateRequest = () => {
    // ✅ PROFILE COMPLETION CHECK: Verify civilian profile exists before navigation
    if (!civilianProfile) {
      Alert.alert(
        'Profile Incomplete',
        'Please complete your profile before creating a service request.',
        [
          { text: 'Complete Profile', onPress: () => router.push('/(civilian)/profile') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // ✅ SAFE PERFORMANCE MONITORING: Check if performanceMonitor exists before using
    // This prevents crashes when performanceMonitor methods are undefined
    if (performanceMonitor?.start && performanceMonitor?.end) {
      performanceMonitor.start('navigate_create_request', 'navigation');
    }
    router.push('/create-request');
    if (performanceMonitor?.end) {
      performanceMonitor.end('navigate_create_request');
    }
  };

  const handleBrowseHeroes = () => {
    // ✅ SAFE PERFORMANCE MONITORING: Optional performance tracking with fallback
    if (performanceMonitor?.start && performanceMonitor?.end) {
      performanceMonitor.start('navigate_browse_heroes', 'navigation');
    }
    router.push('/(civilian)/heroes');
    if (performanceMonitor?.end) {
      performanceMonitor.end('navigate_browse_heroes');
    }
  };

  const handleViewRequests = () => {
    // ✅ SAFE PERFORMANCE MONITORING: Graceful degradation when unavailable
    if (performanceMonitor?.start && performanceMonitor?.end) {
      performanceMonitor.start('navigate_my_requests', 'navigation');
    }
    router.push('/(civilian)/requests');
    if (performanceMonitor?.end) {
      performanceMonitor.end('navigate_my_requests');
    }
  };

  if (profileLoading || requestsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OfflineIndicator />
      
      <View style={styles.header}>
        <Text style={styles.title}>
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </Text>
        <Text style={styles.subtitle}>
          You have {activeRequestsCount} active request{activeRequestsCount !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          title={!civilianProfile ? "Complete Profile First" : "Create Service Request"}
          onPress={handleCreateRequest}
          variant={!civilianProfile ? "secondary" : "primary"}
          testID="create-request-button"
        />
        
        <Button
          title="Browse Heroes"
          onPress={handleBrowseHeroes}
          variant="secondary"
          testID="browse-heroes-button"
        />

        <Button
          title={`My Requests (${activeRequestsCount})`}
          onPress={handleViewRequests}
          variant="secondary"
          testID="my-requests-button"
        />
      </View>
    </View>
  );
}

/**
 * CivilianHomeScreen - Default export component for Expo Router
 * 
 * ✅ DEFAULT EXPORT: Required by Expo Router for proper route handling
 * ✅ ERROR BOUNDARY: Wraps content to catch and handle React errors
 * ✅ PROTECTED ROUTE: Ensures only authenticated civilian users can access
 */
export default function CivilianHomeScreen() {
  return (
    <ErrorBoundary>
      <ProtectedRoute requiredUserType="civilian">
        <CivilianHomeContent />
      </ProtectedRoute>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
});