import { create } from 'zustand';
import { auth } from '../services/supabase';
import { User } from '../types';
import { logger } from '../utils/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, userType: 'civilian' | 'hero') => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    // ✅ SECURITY: Input validation before API calls
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    if (!password || password.length < 12) {
      return { success: false, error: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character' };
    }
    
    // ✅ SECURITY: Enhanced password complexity validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      return { success: false, error: 'Password must contain uppercase, lowercase, number, and special character' };
    }
    
    set({ isLoading: true });
    
    try {
      logger.authOperation('signIn', email.split('@')[1] || 'unknown');
      
      const { data, error } = await auth.signIn(email, password);
      
      if (error) {
        set({ isLoading: false });
        logger.authResult('signIn', false, error);
        
        // ✅ SECURITY: Provide specific, actionable error messages
        let userMessage = 'Login failed. Please try again.';
        
        if (error.message?.includes('Invalid login credentials')) {
          userMessage = 'Email or password is incorrect. Please check and try again.';
        } else if (error.message?.includes('Email not confirmed')) {
          userMessage = 'Please check your email and click the confirmation link before signing in.';
        } else if (error.message?.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait 15 minutes before trying again.';
          // ✅ SECURITY: Log potential brute force attempt
          logger.warn('Rate limit exceeded for signin', { 
            email_domain: email.split('@')[1],
            timestamp: new Date().toISOString()
          });
        } else if (error.message?.includes('User not found')) {
          userMessage = 'No account found with this email. Please check the email or sign up for a new account.';
        }
        
        return { success: false, error: userMessage };
      }

      if (data?.user && data?.session) {
        // ✅ SCHEMA COMPLIANCE: Create User object with proper structure
        const userData: User = {
          id: data.user.id,
          email: data.user.email || '',
          user_type: (data.user.user_metadata?.user_type as 'civilian' | 'hero') || 'civilian',
          user_metadata: data.user.user_metadata || { user_type: 'civilian' },
          created_at: data.user.created_at || '',
          updated_at: data.user.updated_at || '',
        };
        
        set({ 
          user: userData, 
          isAuthenticated: true, 
          isLoading: false 
        });
        
        logger.authResult('signIn', true, null);
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred. Please try again' };
    } catch (error: any) {
      set({ isLoading: false });
      
      // ✅ MONITORING: Enhanced error logging for security monitoring
      const errorLog = {
        event: 'auth_signin_failed',
        error_type: error.name || 'unknown',
        error_code: error.status || error.code || 'unknown',
        error_category: error.message?.includes('network') ? 'network' : 'auth',
        timestamp: new Date().toISOString(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        email_domain: email.split('@')[1] || 'unknown', // Log domain only for analytics
        // ✅ SECURITY: Track potential attack patterns
        is_suspicious: error.message?.includes('Too many requests') || 
                      error.message?.includes('Invalid login credentials'),
        attempt_source: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      };
      
      logger.error('Authentication signin failed', errorLog);
      
      // ✅ UX: Provide user-friendly error message
      let userMessage = 'Login failed due to a network error. Please check your connection and try again.';
      if (!error.message?.includes('network') && !error.message?.includes('fetch')) {
        userMessage = 'Login failed. Please check your credentials and try again.';
      }
      
      return { success: false, error: userMessage };
    }
  },

  signUp: async (email: string, password: string, userType: 'civilian' | 'hero') => {
    // ✅ SECURITY: Input validation before API calls
    if (!email || !email.includes('@') || email.length < 5) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    if (!password || password.length < 12) {
      return { success: false, error: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character' };
    }
    if (!['civilian', 'hero'].includes(userType)) {
      return { success: false, error: 'Please select a valid account type' };
    }
    
    set({ isLoading: true });
    
    try {
      logger.authOperation('signUp', `user_type:${userType}`);
      
      const { data, error } = await auth.signUp(email, password, userType);
      
      if (error) {
        set({ isLoading: false });
        logger.authResult('signUp', false, error);
        return { success: false, error: error.message || 'Signup failed' };
      }

      // ✅ EMAIL VERIFICATION: Don't auto-login, user must verify email first
      if (data?.user) {
        logger.info('User signup successful - email verification required', { 
          userId: data.user.id, 
          userType,
          emailConfirmed: data.user.email_confirmed_at ? true : false
        });
        
        // ✅ IMPORTANT: Don't set user state - they need to verify email first
        set({ 
          isLoading: false,
          isAuthenticated: false,
          user: null
        });
        
        logger.authResult('signUp', true, null);
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred. Please try again' };
    } catch (error: any) {
      set({ isLoading: false });
      logger.authResult('signUp', false, error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    
    try {
      logger.authOperation('signOut');
      
      // ✅ CLEANUP: Unsubscribe from all realtime subscriptions before logout
      const { useRequestsStore } = await import('./requests');
      const { useChatStore } = await import('./chat');
      
      useRequestsStore.getState().unsubscribeFromRequests();
      useChatStore.getState().clearConversations();
      
      await auth.signOut();
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
      logger.authResult('signOut', true, null);
    } catch (error) {
      // Don't log sensitive auth errors in production
      if (__DEV__) {
        console.error('Sign out failed:', error);
      }
      set({ isLoading: false });
    }
  },

  setUser: (user: User | null) => {
    const currentState = get();
    // Only update if user actually changed to prevent unnecessary re-renders
    if (currentState.user?.id !== user?.id || currentState.isAuthenticated !== !!user) {
      set({ 
        user, 
        isAuthenticated: !!user, 
        isLoading: false 
      });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  initialize: async () => {
    set({ isLoading: true });
    
    try {
      // ✅ SECURITY: Check if there's a valid stored session
      const { data, error } = await auth.getSession();
      
      if (error || !data.session?.user) {
        // No session found, user needs to log in
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return;
      }
      
      // ✅ SECURITY: Validate session hasn't expired
      const now = new Date().getTime();
      const expiresAt = data.session.expires_at ? new Date(data.session.expires_at * 1000).getTime() : 0;
      
      if (expiresAt > 0 && now >= expiresAt) {
        logger.warn('Session expired during initialization');
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return;
      }
      
      // ✅ DATA INTEGRITY: Validate user_type exists and is valid
      const userType = data.session.user.user_metadata?.user_type;
      if (!userType || !['civilian', 'hero'].includes(userType)) {
        logger.error('Invalid or missing user_type in session', { 
          userId: data.session.user.id,
          userType 
        });
        
        // Force re-authentication for data integrity
        await auth.signOut();
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
        return;
      }
      
      // Create user object from session
      const userData: User = {
        id: data.session.user.id,
        email: data.session.user.email || '',
        user_type: userType as 'civilian' | 'hero',
        user_metadata: data.session.user.user_metadata || { user_type: userType },
        created_at: data.session.user.created_at || '',
        updated_at: data.session.user.updated_at || '',
      };
      
      set({ 
        user: userData, 
        isAuthenticated: true, 
        isLoading: false 
      });
      
      logger.info('Auth session restored successfully', { 
        userId: userData.id, 
        userType: userData.user_type 
      });
      
    } catch (error) {
      logger.info('Auth initialization completed - no existing session');
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },

  refreshUserProfile: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      // ✅ UX: Don't show loading for background refresh
      logger.info('Refreshing user profile', { userId: user.id });
      
      // ✅ PERFORMANCE: Use cached session first, only refresh if needed
      const { data: sessionData } = await auth.getSession();
      
      // Only make API call if session is stale (older than 5 minutes)
      const sessionAge = sessionData.session ? Date.now() - (sessionData.session.expires_at ? new Date(sessionData.session.expires_at * 1000).getTime() - (60 * 60 * 1000) : 0) : Infinity;
      let userData = sessionData.session?.user;
      
      if (sessionAge > 5 * 60 * 1000) {
        const refreshResult = await auth.getCurrentUser();
        if (refreshResult.error) {
          logger.warn('Failed to refresh user profile', { error: refreshResult.error.message });
          return;
        }
        userData = refreshResult.data.user;
      }
      
      if (userData) {
        // ✅ DATA INTEGRITY: Validate updated data
        const userType = userData.user_metadata?.user_type;
        if (!userType || !['civilian', 'hero'].includes(userType)) {
          logger.error('Invalid user_type during profile refresh', { 
            userId: userData.id,
            userType 
          });
          return;
        }
        
        const updatedUser: User = {
          ...user,
          email: userData.email || user.email,
          user_type: userType as 'civilian' | 'hero',
          user_metadata: userData.user_metadata || user.user_metadata,
          updated_at: userData.updated_at || user.updated_at,
        };
        
        set({ user: updatedUser });
        logger.info('User profile refreshed successfully');
      }
    } catch (error) {
      logger.error('Failed to refresh user profile', { 
        error: String(error),
        userId: user.id 
      });
    }
  },
}));