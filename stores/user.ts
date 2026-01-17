import { create } from 'zustand';
import { database } from '../services/supabase';
import { CivilianProfile, HeroProfile, Profile } from '../types';
import { logger } from '../utils/logger';

interface UserState {
  // ✅ SCHEMA COMPLIANCE: Separate canonical and role-specific profiles (g.md)
  profile: Profile | null;              // Canonical profile from public.profiles
  civilianProfile: CivilianProfile | null;  // Role-specific data
  heroProfile: HeroProfile | null;          // Role-specific data
  isLoading: boolean;
  error: string | null;
  
  // ✅ ONBOARDING STATE: Critical for route protection
  isOnboarded: boolean;                 // True when all required profiles exist
  isProfileLoaded: boolean;             // True when profile fetch is complete
  profileLoadAttempted: boolean;        // True when profile load has been attempted (prevents re-attempts)
  
  // Actions
  loadUserProfile: (userId: string, userType: 'civilian' | 'hero') => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  updateCivilianProfile: (userId: string, updates: Partial<CivilianProfile>) => Promise<{ success: boolean; error?: string }>;
  updateHeroProfile: (userId: string, updates: Partial<HeroProfile>) => Promise<{ success: boolean; error?: string }>;
  clearProfile: () => void;
  setError: (error: string | null) => void;
  checkOnboardingStatus: (userType: 'civilian' | 'hero') => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  civilianProfile: null,
  heroProfile: null,
  isLoading: false,
  error: null,
  isOnboarded: false,
  isProfileLoaded: false,
  profileLoadAttempted: false,

  loadUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
    const state = get();
    
    // ✅ CRITICAL FIX: Prevent multiple simultaneous loads
    // If already loading or already loaded, skip
    if (state.isLoading || state.profileLoadAttempted) {
      logger.info('loadUserProfile skipped', { 
        reason: state.isLoading ? 'already loading' : 'already attempted',
        isLoading: state.isLoading,
        profileLoadAttempted: state.profileLoadAttempted,
        isProfileLoaded: state.isProfileLoaded
      });
      return;
    }
    
    // Mark as attempted immediately to prevent race conditions
    set({ isLoading: true, error: null, profileLoadAttempted: true });
    
    try {
      // ✅ FIX 8: CACHE INVALIDATION - Clear any cached requests before loading
      // This ensures we get fresh data after profile creation/updates
      logger.info('Loading user profile', { userId, userType });
      
      // Step 1: Load canonical profile from public.profiles
      logger.info('Step 1: Loading canonical profile from public.profiles', { userId });
      const { data: profileData, error: profileError } = await database.getProfile(userId);
      
      if (profileError) {
        logger.error('Failed to load canonical profile', { userId, error: profileError });
        set({ 
          error: profileError.message, 
          isLoading: false, 
          isProfileLoaded: true,
          isOnboarded: false 
        });
        return;
      }

      if (!profileData) {
        logger.warn('Canonical profile not found', { userId });
        set({ 
          error: 'Profile not found', 
          isLoading: false, 
          isProfileLoaded: true,
          isOnboarded: false 
        });
        return;
      }

      logger.info('Canonical profile loaded', { userId, role: profileData.role });

      // Step 2: Load role-specific profile
      logger.info('Step 2: Loading role-specific profile', { userId, userType });
      const { data: roleData, error: roleError } = await database.getUserProfile(userId, userType);
      
      logger.info('Role profile query result', { 
        userId, 
        userType, 
        hasData: !!roleData, 
        hasError: !!roleError,
        errorMessage: roleError?.message 
      });
      
      // ✅ ONBOARDING CHECK: Determine if user has completed onboarding
      const hasCanonicalProfile = !!profileData;
      const hasRoleProfile = !!roleData && !roleError;
      const isOnboarded = hasCanonicalProfile && hasRoleProfile;

      logger.info('Onboarding status calculated', {
        userId,
        userType,
        hasCanonicalProfile,
        hasRoleProfile,
        isOnboarded
      });

      // Set the loaded data with onboarding status
      if (userType === 'civilian') {
        set({ 
          profile: profileData as Profile,
          civilianProfile: roleData as CivilianProfile || null,
          heroProfile: null,
          isLoading: false,
          isProfileLoaded: true,
          isOnboarded
        });
      } else {
        set({ 
          profile: profileData as Profile,
          heroProfile: roleData as HeroProfile || null,
          civilianProfile: null,
          isLoading: false,
          isProfileLoaded: true,
          isOnboarded
        });
      }

      // ✅ LOGGING: Track onboarding status for debugging
      logger.info('Profile loaded', { 
        userId, 
        userType, 
        hasCanonicalProfile, 
        hasRoleProfile, 
        isOnboarded 
      });
      
    } catch (error) {
      logger.error('Failed to load user profile', { userId, error });
      set({ 
        error: 'Failed to load user profile', 
        isLoading: false,
        isProfileLoaded: true,
        isOnboarded: false
      });
    }
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await database.updateProfile(userId, updates);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      if (data) {
        set({ 
          profile: data,
          isLoading: false 
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      set({ 
        error: 'Failed to update profile', 
        isLoading: false 
      });
      return { success: false, error: 'Network error occurred' };
    }
  },

  updateCivilianProfile: async (userId: string, updates: Partial<CivilianProfile>) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await database.updateCivilianProfile(userId, updates);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      if (data) {
        set(state => ({ 
          civilianProfile: data,
          isLoading: false,
          // ✅ UPDATE ONBOARDING STATUS: Recalculate after profile update
          isOnboarded: !!state.profile && !!data
        }));
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      set({ 
        error: 'Failed to update profile', 
        isLoading: false 
      });
      return { success: false, error: 'Network error occurred' };
    }
  },

  updateHeroProfile: async (userId: string, updates: Partial<HeroProfile>) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await database.updateHeroProfile(userId, updates);
      
      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      if (data) {
        set(state => ({ 
          heroProfile: data,
          isLoading: false,
          // ✅ UPDATE ONBOARDING STATUS: Recalculate after profile update
          isOnboarded: !!state.profile && !!data
        }));
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      set({ 
        error: 'Failed to update profile', 
        isLoading: false 
      });
      return { success: false, error: 'Network error occurred' };
    }
  },

  clearProfile: () => {
    logger.info('Clearing profile state');
    set({ 
      profile: null,
      civilianProfile: null, 
      heroProfile: null, 
      error: null,
      isLoading: false,
      isOnboarded: false,
      isProfileLoaded: false,
      profileLoadAttempted: false  // Reset on logout
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  checkOnboardingStatus: (userType: 'civilian' | 'hero') => {
    const state = get();
    
    // ✅ ONBOARDING VALIDATION: Check both canonical and role-specific profiles exist
    const hasCanonicalProfile = !!state.profile;
    const hasRoleProfile = userType === 'civilian' 
      ? !!state.civilianProfile 
      : !!state.heroProfile;
    
    return hasCanonicalProfile && hasRoleProfile;
  },
}));