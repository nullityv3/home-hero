import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { auth } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';
import { logger } from '@/utils/logger';

// ✅ Configurable timeout (longer in dev for debugging)
const BOOTSTRAP_TIMEOUT = __DEV__ ? 15000 : 8000;

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user, initialize, setUser } = useAuthStore();
  const hasNavigatedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    logger.info('Bootstrap: Starting app initialization');
    
    // Initialize auth state
    initialize();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      logger.info('Bootstrap: Auth state changed', { event, hasSession: !!session });
      
      if (event === 'SIGNED_IN' && session?.user) {
        // ✅ FIX: Validate user_type before using it
        const rawUserType = session.user.user_metadata?.user_type;
        const validUserTypes = ['civilian', 'hero'] as const;
        const userType = validUserTypes.includes(rawUserType) ? rawUserType : 'civilian';
        
        if (!validUserTypes.includes(rawUserType)) {
          logger.warn('Bootstrap: Invalid user_type in metadata, defaulting to civilian', { 
            rawUserType 
          });
        }
        
        // Create user object from session data
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          user_type: userType,
          user_metadata: session.user.user_metadata || { user_type: userType },
          created_at: session.user.created_at || '',
          updated_at: session.user.updated_at || '',
        };
        setUser(userData);
        logger.info('Bootstrap: User set from auth state', { userId: userData.id, userType: userData.user_type });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        hasNavigatedRef.current = false; // Reset navigation flag on logout
        logger.info('Bootstrap: User signed out');
      }
    });

    return () => {
      subscription?.unsubscribe();
      // ✅ FIX: Clear timeout on unmount to prevent memory leak
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [initialize, setUser]);

  // ✅ FIX: Navigation with hard timeout and fire-once guard
  useEffect(() => {
    if (isLoading) {
      logger.info('Bootstrap: Still loading auth state');
      return;
    }

    // ✅ FIRE-ONCE GUARD: Prevent multiple navigation attempts
    if (hasNavigatedRef.current) {
      logger.info('Bootstrap: Already navigated, skipping');
      return;
    }

    logger.info('Bootstrap: Auth loaded, determining navigation', { 
      isAuthenticated, 
      userType: user?.user_type 
    });

    // ✅ HARD TIMEOUT: Prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!hasNavigatedRef.current) {
        logger.error('Bootstrap: Timeout reached, forcing navigation to login');
        hasNavigatedRef.current = true;
        router.replace('/(auth)/login');
      }
    }, BOOTSTRAP_TIMEOUT);

    // ✅ Helper function for safe navigation with error handling
    const navigateSafely = async (path: string, reason: string) => {
      try {
        logger.info(`Bootstrap: ${reason}`);
        await router.replace(path as any);
        
        // ✅ FIX: Clear timeout AFTER successful navigation
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } catch (error) {
        logger.error('Bootstrap: Navigation failed', { path, error });
        
        // Fallback: try login page if not already going there
        if (path !== '/(auth)/login') {
          try {
            await router.replace('/(auth)/login');
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          } catch (fallbackError) {
            logger.error('Bootstrap: Fallback navigation also failed', { fallbackError });
          }
        }
      }
    };

    // Redirect based on authentication status and user type
    if (isAuthenticated && user) {
      hasNavigatedRef.current = true;
      
      if (user.user_type === 'civilian') {
        navigateSafely('/(civilian)/home', 'Navigating to civilian home');
      } else if (user.user_type === 'hero') {
        navigateSafely('/(hero)/dashboard', 'Navigating to hero dashboard');
      } else {
        logger.error('Bootstrap: Invalid user type, navigating to login');
        navigateSafely('/(auth)/login', 'Invalid user type, redirecting to login');
      }
    } else {
      // Redirect unauthenticated users to login
      hasNavigatedRef.current = true;
      navigateSafely('/(auth)/login', 'Not authenticated, navigating to login');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading spinner while checking authentication
  return (
    <View 
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading application"
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator 
        size="large" 
        color="#007AFF"
        accessibilityLabel="Loading indicator"
      />
      <Text 
        style={styles.loadingText}
        accessibilityRole="text"
      >
        Loading...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});