import { ProtectedRoute } from '@/components/auth/protected-route';
import { TabBarIcon } from '@/components/navigation/tab-bar-icon';
import { useAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { logger } from '@/utils/logger';
import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function HeroLayout() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isProfileLoaded, isOnboarded, profileLoadAttempted, loadUserProfile } = useUserStore();
  
  // ✅ SIMPLIFIED: Only need redirect guard, profile load is handled by store
  const hasRedirectedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ FIX: LOAD PROFILE ONCE - Store handles the fire-once logic
  useEffect(() => {
    if (!user?.id || user?.user_type !== 'hero') {
      logger.warn('Hero layout: Invalid user state', { userId: user?.id, userType: user?.user_type });
      return;
    }

    // Store will handle preventing multiple loads via profileLoadAttempted
    logger.info('Hero layout: Triggering profile load', { 
      userId: user.id,
      profileLoadAttempted,
      isProfileLoaded
    });
    
    loadUserProfile(user.id, 'hero');

    // ✅ HARD TIMEOUT: Prevent infinite loading (8 seconds)
    timeoutRef.current = setTimeout(() => {
      if (!isProfileLoaded && !hasRedirectedRef.current) {
        logger.error('Hero layout: Profile load timeout, forcing navigation to profile');
        hasRedirectedRef.current = true;
        router.replace('/(hero)/profile');
      }
    }, 8000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user?.id, user?.user_type]); // ✅ Safe to include loadUserProfile now since store prevents re-execution

  // ✅ FIX: ONBOARDING REDIRECT - Fire once when profile loaded
  useEffect(() => {
    // Guard: Don't do anything until profile is fully loaded
    if (!isProfileLoaded) {
      logger.info('Hero layout: Waiting for profile to load', {
        isProfileLoaded,
        profileLoadAttempted
      });
      return;
    }

    logger.info('Hero layout: Profile loaded, checking onboarding', {
      isProfileLoaded,
      isOnboarded,
      hasRedirected: hasRedirectedRef.current
    });

    // Clear timeout once profile is loaded
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Guard: Ensure user exists
    if (!user) {
      logger.warn('Hero layout: No user found after profile load');
      return;
    }

    // Guard: Only redirect once per session
    if (hasRedirectedRef.current) {
      logger.info('Hero layout: Already redirected, skipping');
      return;
    }

    // ✅ FIX: DECLARATIVE ROUTING - Redirect only when onboarding incomplete
    if (!isOnboarded) {
      hasRedirectedRef.current = true;
      
      logger.info('Hero layout: Onboarding incomplete, redirecting to profile', {
        userType: user.user_type,
        isOnboarded,
      });
      
      // Use replace to prevent back navigation to incomplete state
      router.replace('/(hero)/profile');
    } else {
      logger.info('Hero layout: Onboarding complete, user can access tabs');
    }
  }, [isProfileLoaded, isOnboarded, user, router]);

  // ✅ FIX: LOADING SCREEN - Show loading while profile resolves
  if (!isProfileLoaded) {
    logger.info('Hero layout: Rendering loading screen', {
      isProfileLoaded,
      profileLoadAttempted
    });
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading profile...</Text>
      </View>
    );
  }

  logger.info('Hero layout: Rendering tabs', {
    isProfileLoaded,
    isOnboarded
  });

  return (
    <ProtectedRoute requiredUserType="hero">
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#E5E5EA',
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Job Requests',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'briefcase' : 'briefcase-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}