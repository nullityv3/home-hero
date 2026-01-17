import { useAuthStore } from '@/stores/auth';
import { Redirect } from 'expo-router';

export default function TabIndexScreen() {
  const { isAuthenticated, user } = useAuthStore();

  // Redirect to appropriate route based on authentication and user type
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.user_type === 'civilian') {
    return <Redirect href="/(civilian)/home" />;
  } else if (user.user_type === 'hero') {
    return <Redirect href="/(hero)/dashboard" />;
  }

  // Fallback redirect
  return <Redirect href="/(auth)/login" />;
}