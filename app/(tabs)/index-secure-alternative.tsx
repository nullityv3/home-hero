import { ProtectedRoute } from '@/components/auth/protected-route';
import { ErrorMessage } from '@/components/ui/error-message';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function TabIndexScreen() {
  const { user } = useAuthStore();
  const { isLoading, error } = useUserStore();

  return (
    <ProtectedRoute requiresOnboarding={true}>
      <View style={styles.container}>
        {/* Error Handling */}
        {error && (
          <ErrorMessage 
            error={error} 
            onDismiss={() => {}} 
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Main Content */}
        {!isLoading && !error && (
          <View style={styles.content}>
            <Text 
              style={styles.title}
              accessibilityRole="header"
              accessibilityLevel={1}
            >
              Welcome, {user?.user_type === 'civilian' ? 'Civilian' : 'Hero'}!
            </Text>
            <Text 
              style={styles.subtitle}
              accessibilityHint="This is the main tab screen"
            >
              Tab Index Screen
            </Text>
          </View>
        )}
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});