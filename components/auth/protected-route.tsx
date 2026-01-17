import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { logger } from '@/utils/logger';
import { useRouter, useSegments } from 'expo-router';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'civilian' | 'hero';
}

export function ProtectedRoute({ 
  children, 
  requiredUserType
}: ProtectedRouteProps) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const { 
    isLoading: profileLoading, 
    isProfileLoaded, 
    isOnboarded, 
    loadUserProfile 
  } = useUserStore();

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // ✅ NAVIGATION-IN-PROGRESS GUARD: Prevents race conditions during navigation
  const isNavigatingRef = useRef(false);

  // ✅ MEMOIZED PROFILE LOADING: Prevent unnecessary re-calls
  const profileLoadAttempted = useRef(false);
  
  const loadProfile = useCallback(async () => {
    // ✅ DEBUG: Log the guard conditions
    console.log('🔍 loadProfile called', {
      profileLoadAttempted: profileLoadAttempted.current,
      isAuthenticated,
      userId: user?.id,
      userType: user?.user_type,
      isProfileLoaded,
      isLoadingProfile
    });
    
    logger.info('loadProfile called', {
      profileLoadAttempted: profileLoadAttempted.current,
      isAuthenticated,
      userId: user?.id,
      userType: user?.user_type,
      isProfileLoaded,
      isLoadingProfile
    });
    
    // ✅ PREVENT DUPLICATE LOADS: Only load once per session
    if (profileLoadAttempted.current || !isAuthenticated || !user?.id || !user?.user_type || isProfileLoaded || isLoadingProfile) {
      const reason = profileLoadAttempted.current ? 'already attempted' :
                !isAuthenticated ? 'not authenticated' :
                !user?.id ? 'no user id' :
                !user?.user_type ? 'no user type' :
                isProfileLoaded ? 'already loaded' :
                isLoadingProfile ? 'currently loading' : 'unknown';
      
      console.log('⚠️ loadProfile skipped:', reason);
      logger.info('loadProfile skipped due to guards', { reason });
      return;
    }
    
    profileLoadAttempted.current = true;
    setIsLoadingProfile(true);
    setProfileError(null);
    
    console.log('🚀 Starting profile load', { userId: user.id, userType: user.user_type });
    logger.info('Starting profile load', { userId: user.id, userType: user.user_type });
    
    try {
      await loadUserProfile(user.id, user.user_type);
      console.log('✅ Profile loaded successfully', { userId: user.id, userType: user.user_type });
      logger.info('Profile loaded successfully', { 
        userId: user.id, 
        userType: user.user_type 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Profile loading failed:', errorMessage, error);
      setProfileError(errorMessage);
      profileLoadAttempted.current = false; // Allow retry on error
      logger.error('Profile loading failed', {
        userId: user.id,
        userType: user.user_type,
        error: errorMessage
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isAuthenticated, user?.id, user?.user_type, isProfileLoaded, isLoadingProfile, loadUserProfile]);

  // ✅ PROFILE LOADING: Load user profile when authenticated
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ✅ RESET PROFILE LOAD FLAG: When user changes, allow profile to be loaded again
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      profileLoadAttempted.current = false;
    }
  }, [isAuthenticated, user?.id]);

  // ✅ TIMEOUT PROTECTION: Prevent infinite loading
  useEffect(() => {
    if (isAuthenticated && !isProfileLoaded && !profileLoadTimeout && !profileError) {
      const timeout = setTimeout(() => {
        setProfileLoadTimeout(true);
        logger.warn('Profile loading timeout', { userId: user?.id });
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, isProfileLoaded, profileLoadTimeout, profileError, user?.id]);

  // ✅ MEMOIZE: Prevent unnecessary recalculations
  const inAuthGroup = useMemo(() => segments[0] === '(auth)', [segments]);
  const inCivilianGroup = useMemo(() => segments[0] === '(civilian)', [segments]);
  const inHeroGroup = useMemo(() => segments[0] === '(hero)', [segments]);

  // 🚨 CRITICAL: Navigation logic with race condition protection
  useEffect(() => {
    // ✅ GUARD: Block all redirects if navigation is in progress
    if (isNavigatingRef.current) {
      return;
    }

    // Wait for auth to finish loading
    if (authLoading) return;

    // Helper to navigate with timeout reset
    const navigateWithReset = (path: string, reason: string) => {
      isNavigatingRef.current = true;
      logger.info(reason, { path });
      router.replace(path as any);
      
      // ✅ FIX: Reset navigation guard after navigation completes
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    };

    // Redirect unauthenticated users to login (unless already in auth group)
    if (!isAuthenticated && !inAuthGroup) {
      navigateWithReset('/(auth)/login', 'Redirecting to login - not authenticated');
      return;
    }

    // Redirect authenticated users away from auth screens
    if (isAuthenticated && user && inAuthGroup) {
      const homePath = user.user_type === 'civilian' ? '/(civilian)/home' : '/(hero)/dashboard';
      navigateWithReset(homePath, `Redirecting away from auth screen - ${user.user_type}`);
      return;
    }

    // Wait for profile to load before checking user type and onboarding
    if (isAuthenticated && !isProfileLoaded && !profileError && !profileLoadTimeout) {
      return;
    }

    // Redirect to correct user type group
    if (isAuthenticated && user && requiredUserType && user.user_type !== requiredUserType) {
      const correctPath = user.user_type === 'civilian' ? '/(civilian)/home' : '/(hero)/dashboard';
      navigateWithReset(correctPath, `Redirecting to correct user type group - ${user.user_type}`);
      return;
    }
  }, [
    authLoading,
    isAuthenticated,
    user?.id,
    user?.user_type,
    requiredUserType,
    isProfileLoaded,
    profileError,
    profileLoadTimeout,
    inAuthGroup,
    inCivilianGroup,
    inHeroGroup,
    router
  ]);

  // ✅ ERROR STATE: Handle profile loading failures
  if (profileError || profileLoadTimeout) {
    const handleRetry = () => {
      setProfileError(null);
      setProfileLoadTimeout(false);
      profileLoadAttempted.current = false; // Reset the flag to allow retry
      loadProfile();
    };

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>
          {profileError ? 'Profile Loading Failed' : 'Loading Timeout'}
        </Text>
        <Text style={styles.errorMessage}>
          {profileError || 'Unable to load your profile. Please try again.'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
          accessibilityHint="Double tap to attempt loading your profile again"
          accessibilityState={{ busy: isLoadingProfile }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ LOADING STATE: Show spinner during auth or profile loading
  if (authLoading || (isAuthenticated && !isProfileLoaded)) {
    const loadingMessage = authLoading 
      ? 'Checking authentication...' 
      : 'Loading your profile...';
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
});