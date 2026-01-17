import { useAuthStore } from '@/stores/auth';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function AuthLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // 🚨 CRITICAL: Use useEffect for navigation to prevent infinite loops
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Redirect authenticated users away from auth screens
    if (isAuthenticated && user && inAuthGroup) {
      if (user.user_type === 'civilian') {
        router.replace('/(civilian)/home');
      } else if (user.user_type === 'hero') {
        router.replace('/(hero)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, segments, router]);

  // Show loading screen during auth initialization
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});