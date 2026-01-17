import type { ChatMessage, CivilianProfile, HeroProfile, ServiceRequest } from '@/types';
import { logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BULLETPROOF ENVIRONMENT LOADING STRATEGY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Priority: Constants.expoConfig.extra > process.env
// This ensures credentials work even if .env fails to load
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getSupabaseConfig() {
  // FIRST: Try Constants.expoConfig.extra (most reliable in Expo)
  const extra = Constants.expoConfig?.extra;
  let url = extra?.supabaseUrl;
  let key = extra?.supabaseAnonKey;
  let source = 'Constants.expoConfig.extra';

  // FALLBACK: Try process.env (for Node.js scripts/tests)
  if (!url || !key) {
    url = url || process.env.EXPO_PUBLIC_SUPABASE_URL;
    key = key || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    source = 'process.env';
  }

  return { 
    url: url || '', 
    key: key || '',
    source 
  };
}

const { url: supabaseUrl, key: supabaseAnonKey, source: configSource } = getSupabaseConfig();

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please ensure app.config.js has extra.supabaseUrl and extra.supabaseAnonKey configured.'
  );
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid Supabase URL. Must start with https://');
}

if (supabaseUrl.includes('your-project') || supabaseUrl === 'https://demo.supabase.co') {
  throw new Error('Please replace the placeholder Supabase URL with your actual project URL in app.config.js');
}

if (supabaseAnonKey.includes('your_anon_key') || supabaseAnonKey.length < 100) {
  throw new Error('Please replace the placeholder Supabase anon key with your actual project key in app.config.js');
}

// Extract project ID from URL for logging
const projectId = supabaseUrl.split('//')[1]?.split('.')[0] || 'unknown';

// Log configuration status at startup (without exposing sensitive data)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Supabase Client Initialization');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Mode: PRODUCTION - Real Database Client');
console.log(`✅ Project ID: ${projectId}`);
console.log(`✅ URL: ${supabaseUrl}`);
console.log(`✅ Key Length: ${supabaseAnonKey.length} characters`);
console.log(`✅ Config Source: ${configSource}`);
console.log(`✅ .env Dependency: NONE (bulletproof mode)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Create the real Supabase client - NO MOCK MODE EVER
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Configuration constants
const CONFIG = {
  AUTH: {
    MAX_ATTEMPTS: parseInt(process.env.MAX_AUTH_ATTEMPTS || '5'),
    LOCKOUT_DURATION: parseInt(process.env.AUTH_LOCKOUT_MINUTES || '15') * 60 * 1000,
  },
  VALIDATION: {
    MAX_TITLE_LENGTH: parseInt(process.env.MAX_TITLE_LENGTH || '200'),
    MAX_DESCRIPTION_LENGTH: parseInt(process.env.MAX_DESCRIPTION_LENGTH || '2000'),
    MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH || '1000'),
    MAX_ADDRESS_LENGTH: parseInt(process.env.MAX_ADDRESS_LENGTH || '200'),
  },
  CACHE: {
    TTL: parseInt(process.env.CACHE_TTL_MINUTES || '5') * 60 * 1000,
    MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '100'),
  }
};

// Rate limiting for authentication attempts
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

const checkRateLimit = (email: string): { allowed: boolean; remainingTime?: number } => {
  const now = Date.now();
  const attempts = authAttempts.get(email);
  
  if (!attempts) {
    return { allowed: true };
  }
  
  // Reset if lockout period has passed
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    authAttempts.delete(email);
    return { allowed: true };
  }
  
  if (attempts.count >= MAX_AUTH_ATTEMPTS) {
    const remainingTime = LOCKOUT_DURATION - (now - attempts.lastAttempt);
    return { allowed: false, remainingTime };
  }
  
  return { allowed: true };
};

const recordAuthAttempt = (email: string, success: boolean) => {
  const now = Date.now();
  const attempts = authAttempts.get(email) || { count: 0, lastAttempt: now };
  
  if (success) {
    // Clear attempts on successful login
    authAttempts.delete(email);
  } else {
    // Increment failed attempts
    authAttempts.set(email, {
      count: attempts.count + 1,
      lastAttempt: now
    });
  }
};

// Auth helper functions
export const auth = {
  signUp: async (email: string, password: string, userType: 'civilian' | 'hero') => {
    // Log operation without exposing PII
    logger.authOperation('signUp', `user_type:${userType}`);
    
    // NOTE: After successful signup, caller MUST create profile using:
    // - database.createCivilianProfile() for civilians
    // - database.createHeroProfile() for heroes
    
    // Enhanced password validation
    if (password.length < 12) {
      logger.warn('Password validation failed: too short');
      return { data: null, error: { message: 'Password must be at least 12 characters long' } };
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      logger.warn('Password validation failed: missing required characters');
      return { data: null, error: { message: 'Password must contain uppercase, lowercase, number, and special character' } };
    }
    // Check for common weak passwords
    const commonPasswords = ['password123', 'admin123', '123456789', 'qwerty123'];
    if (commonPasswords.some(weak => password.toLowerCase().includes(weak.toLowerCase()))) {
      logger.warn('Password validation failed: too common');
      return { data: null, error: { message: 'Password is too common. Please choose a stronger password' } };
    }

    const startTime = Date.now();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType,
        },
      },
    });
    
    const duration = Date.now() - startTime;
    // Log result without exposing sensitive error details
    logger.authResult('signUp', !error, error ? { message: error.message } : null);
    logger.performance('auth.signUp', duration);
    
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    // Check rate limiting
    const rateCheck = checkRateLimit(email);
    if (!rateCheck.allowed) {
      const minutes = Math.ceil((rateCheck.remainingTime || 0) / 60000);
      return { 
        data: null, 
        error: { message: `Too many failed attempts. Try again in ${minutes} minutes.` } 
      };
    }

    // Log operation without exposing PII (hash email for tracking if needed)
    const emailHash = email.split('@')[1] || 'unknown'; // Just log domain
    logger.authOperation('signIn', `domain:${emailHash}`);
    
    const startTime = Date.now();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Record auth attempt for rate limiting
    recordAuthAttempt(email, !error);
    
    const duration = Date.now() - startTime;
    // Log result without exposing sensitive error details
    logger.authResult('signIn', !error, error ? { message: error.message } : null);
    logger.performance('auth.signIn', duration);
    
    return { data, error };
  },

  signOut: async () => {
    logger.authOperation('signOut');
    
    const { error } = await supabase.auth.signOut();
    
    logger.authResult('signOut', !error, error);
    return { error };
  },

  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Validate session hasn't expired
    if (session && session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      if (expiresAt < new Date()) {
        logger.warn('Session expired');
        return { data: { session: null }, error: { message: 'Session expired' } };
      }
    }
    
    return { data: { session }, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'homeheroes://reset-password',
    });
    return { error };
  },

  updatePassword: async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  },
};

// Request deduplication cache with TTL and size limits
class RequestCache {
  private cache = new Map<string, { promise: Promise<any>; timestamp: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 100;

  set(key: string, promise: Promise<any>) {
    // Clean expired entries
    this.cleanup();
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, { promise, timestamp: Date.now() });
  }

  get(key: string): Promise<any> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.promise;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }
}

const requestCache = new RequestCache();

// Database helper functions
export const database = {
  // ✅ SCHEMA COMPLIANCE: Create canonical profile first (g.md rule)
  createProfile: async (userId: string, role: 'civilian' | 'hero', profileData: { full_name?: string; phone?: string }) => {
    logger.supabaseQuery('insert', 'profiles', { userId, role });
    
    const startTime = Date.now();
    // ✅ IDEMPOTENT: Use upsert to handle duplicate inserts safely
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,  // ✅ Primary key = auth.users.id
        role,
        full_name: profileData.full_name || null,
        phone: profileData.phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      })
      .select()
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('createProfile', !error, data, error);
    logger.performance('db.createProfile', duration);
    
    return { data, error };
  },

  // ✅ SCHEMA COMPLIANCE: Get canonical profile from public.profiles (g.md rule)
  getProfile: async (userId: string) => {
    logger.supabaseQuery('select', 'profiles', { userId });
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)  // ✅ Query by primary key
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('getProfile', !error, data, error);
    logger.performance('db.getProfile', duration);
    
    return { data, error };
  },

  // ✅ SCHEMA COMPLIANCE: Update canonical profile in public.profiles (g.md rule)
  updateProfile: async (userId: string, updates: any) => {
    // Validate required fields and sanitize input
    if (!userId || typeof userId !== 'string') {
      logger.warn('updateProfile: Invalid user ID');
      return { data: null, error: { message: 'Valid user ID is required' } };
    }
    
    // ✅ SECURITY: Verify authenticated user matches the profile being updated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      logger.warn('updateProfile: Unauthorized access attempt', { userId, authenticatedUserId: user?.id });
      return { data: null, error: { message: 'Unauthorized: You can only update your own profile' } };
    }
    
    // Remove any system fields that shouldn't be updated
    const { id, created_at, ...sanitizedUpdates } = updates;
    
    logger.supabaseQuery('update', 'profiles', { userId, fields: Object.keys(sanitizedUpdates) });
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)  // ✅ Query by primary key
      .select()
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('updateProfile', !error, data, error);
    logger.performance('db.updateProfile', duration);
    
    return { data, error };
  },

  // User profiles
  createCivilianProfile: async (userId: string, profile: Partial<CivilianProfile>) => {
    logger.supabaseQuery('insert', 'civilian_profiles', { userId });
    
    const startTime = Date.now();
    // ✅ SCHEMA COMPLIANCE: Only store civilian-specific fields
    // full_name and phone belong in public.profiles, not here (g.md rule)
    // ✅ IDEMPOTENT: Use upsert to handle duplicate inserts safely
    const { data, error } = await supabase
      .from('civilian_profiles')
      .upsert({
        profile_id: userId,        // ✅ FK to public.profiles.id
        address: profile.address || null,  // ✅ Civilian-specific field only
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id',
        ignoreDuplicates: false
      })
      .select()
      .maybeSingle();  // ✅ Use maybeSingle() per g.md rules
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('createCivilianProfile', !error, data, error);
    logger.performance('db.createCivilianProfile', duration);
    
    return { data, error };
  },

  createHeroProfile: async (userId: string, profile: Partial<HeroProfile>) => {
    logger.supabaseQuery('insert', 'hero_profiles', { userId });
    
    const startTime = Date.now();
    // ✅ SCHEMA COMPLIANCE: Only store hero-specific fields
    // full_name and phone belong in public.profiles, not here (g.md rule)
    // ✅ IDEMPOTENT: Use upsert to handle duplicate inserts safely
    const { data, error } = await supabase
      .from('hero_profiles')
      .upsert({
        profile_id: userId,        // ✅ FK to public.profiles.id
        skills: profile.skills || [],  // ✅ Hero-specific fields only
        hourly_rate: profile.hourly_rate || 0,
        rating: 0,
        completed_jobs: 0,
        profile_image_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'profile_id',
        ignoreDuplicates: false
      })
      .select()
      .maybeSingle();  // ✅ Use maybeSingle() per g.md rules
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('createHeroProfile', !error, data, error);
    logger.performance('db.createHeroProfile', duration);
    
    return { data, error };
  },

  getUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      logger.warn('getUserProfile: Invalid user ID');
      return { data: null, error: { message: 'Valid user ID is required' } };
    }

    // ✅ FIX 9: NO CACHING FOR PROFILE QUERIES
    // Profile queries should always be fresh to avoid stale onboarding state
    // Cache was causing the infinite loop by returning old "no profile" results
    logger.supabaseQuery('select', `${userType}_profiles`, { userId });

    const startTime = Date.now();
    // Query the appropriate profile table based on user type
    const tableName = userType === 'civilian' ? 'civilian_profiles' : 'hero_profiles';
    
    // Get all matching profiles and take the most recent one
    // This handles duplicate profiles gracefully until they're cleaned up
    const { data: profiles, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('profile_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    // Extract the first profile from the array
    const data = profiles && profiles.length > 0 ? profiles[0] : null;
    
    const duration = Date.now() - startTime;
    
    // ✅ FIX: Missing profile is NOT an error - it's an onboarding state
    if (!error && !data) {
      // Log as INFO, not ERROR (per directive rule 6)
      logger.info('getUserProfile: Profile not found - user in onboarding state', { userId, userType });
      logger.performance('db.getUserProfile', duration);
      // Return null data without error - caller must route to profile completion
      return { data: null, error: null };
    }
    
    logger.supabaseResult('getUserProfile', !error, data, error);
    logger.performance('db.getUserProfile', duration);
    
    return { data, error };
  },

  updateCivilianProfile: async (userId: string, updates: any) => {
    // Validate required fields and sanitize input
    if (!userId || typeof userId !== 'string') {
      logger.warn('updateCivilianProfile: Invalid user ID');
      return { data: null, error: { message: 'Valid user ID is required' } };
    }
    
    // ✅ SECURITY: Verify authenticated user matches the profile being updated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      logger.warn('updateCivilianProfile: Unauthorized access attempt', { userId, authenticatedUserId: user?.id });
      return { data: null, error: { message: 'Unauthorized: You can only update your own profile' } };
    }
    
    // Remove any system fields that shouldn't be updated
    const { id, created_at, ...sanitizedUpdates } = updates;
    
    logger.supabaseQuery('update', 'civilian_profiles', { userId, fields: Object.keys(sanitizedUpdates) });
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('civilian_profiles')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', userId)
      .select()
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('updateCivilianProfile', !error, data, error);
    logger.performance('db.updateCivilianProfile', duration);
    
    return { data, error };
  },

  updateHeroProfile: async (userId: string, updates: any) => {
    // Validate required fields and sanitize input
    if (!userId || typeof userId !== 'string') {
      logger.warn('updateHeroProfile: Invalid user ID');
      return { data: null, error: { message: 'Valid user ID is required' } };
    }
    
    // ✅ SECURITY: Verify authenticated user matches the profile being updated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      logger.warn('updateHeroProfile: Unauthorized access attempt', { userId, authenticatedUserId: user?.id });
      return { data: null, error: { message: 'Unauthorized: You can only update your own profile' } };
    }
    
    // Remove any system fields that shouldn't be updated
    const { id, created_at, ...sanitizedUpdates } = updates;
    
    logger.supabaseQuery('update', 'hero_profiles', { userId, fields: Object.keys(sanitizedUpdates) });
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('hero_profiles')
      .update({
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('profile_id', userId)
      .select()
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('updateHeroProfile', !error, data, error);
    logger.performance('db.updateHeroProfile', duration);
    
    return { data, error };
  },

  // Service requests
  createServiceRequest: async (request: any) => {
    // ✅ SCHEMA COMPLIANCE: Get authenticated user and fetch profile ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'Authentication required' } };
    }

    // ✅ SCHEMA COMPLIANCE: Fetch profile ID from profiles table (g.md rule)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn('createServiceRequest: Profile not found', { 
        userId: user.id, 
        error: profileError 
      });
      return { data: null, error: { message: 'User profile not found' } };
    }

    // ✅ SCHEMA COMPLIANCE: Verify user is a civilian
    if (profile.role !== 'civilian') {
      return { data: null, error: { message: 'Only civilians can create service requests' } };
    }

    logger.supabaseQuery('insert', 'service_requests', { civilian_id: profile.id });
    
    // Basic validation - civilian_id is now derived from profile
    if (!request.title || !request.description || !request.category) {
      return { 
        data: null, 
        error: { message: 'Missing required fields: title, description, and category are required' } 
      };
    }

    if (!request.location || !request.scheduled_date || !request.estimated_duration || !request.budget_range) {
      return { 
        data: null, 
        error: { message: 'Missing required fields: location, scheduled_date, estimated_duration, and budget_range are required' } 
      };
    }

    // ✅ VALIDATION: Verify scheduled_date is in the future
    const scheduledDate = new Date(request.scheduled_date);
    if (isNaN(scheduledDate.getTime())) {
      return { data: null, error: { message: 'Invalid scheduled_date format' } };
    }
    if (scheduledDate < new Date()) {
      return { data: null, error: { message: 'Scheduled date must be in the future' } };
    }

    // ✅ VALIDATION: Verify category is valid
    const validCategories = ['cleaning', 'repairs', 'delivery', 'tutoring', 'other'];
    if (!validCategories.includes(request.category)) {
      return { data: null, error: { message: `Invalid category. Must be one of: ${validCategories.join(', ')}` } };
    }

    // ✅ VALIDATION: Verify budget_range is valid
    if (!request.budget_range.min || !request.budget_range.max || 
        request.budget_range.min < 0 || request.budget_range.max < request.budget_range.min) {
      return { data: null, error: { message: 'Invalid budget_range. Min must be >= 0 and max must be >= min' } };
    }

    const startTime = Date.now();
    const sanitizedRequest = {
      civilian_id: profile.id, // ✅ SCHEMA COMPLIANCE: Use profile.id from profiles table
      title: request.title.trim().substring(0, 200), // Limit length
      description: request.description.trim().substring(0, 2000), // Limit length
      category: request.category,
      location: request.location,
      scheduled_date: request.scheduled_date,
      estimated_duration: Math.max(1, Math.min(24, request.estimated_duration)), // Clamp 1-24 hours
      budget_range: request.budget_range,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('service_requests')
      .insert(sanitizedRequest)
      .select()
      .single();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('createServiceRequest', !error, data, error);
    logger.performance('db.createServiceRequest', duration);
    
    return { data, error };
  },

  getServiceRequests: async (userId: string, userType: 'civilian' | 'hero') => {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return { data: null, error: { message: 'Valid user ID is required' } };
    }
    
    if (!['civilian', 'hero'].includes(userType)) {
      return { data: null, error: { message: 'Invalid user type' } };
    }

    if (userType === 'civilian') {
      // Civilians see only their own requests
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('civilian_id', userId)
        .order('created_at', { ascending: false });
      return { data, error };
    } else {
      // Heroes see:
      // 1. All pending requests (available to accept)
      // 2. Requests assigned to them
      // 3. Active jobs they're working on
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .or(`status.eq.pending,hero_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      return { data, error };
    }
  },

  updateServiceRequest: async (requestId: string, updates: any) => {
    if (!requestId || typeof requestId !== 'string') {
      return { data: null, error: { message: 'Valid request ID is required' } };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: { message: 'Unauthorized' } };
    }

    const { data: existingRequest, error: fetchError } = await supabase
      .from('service_requests')
      .select('civilian_id, hero_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      return { data: null, error: { message: 'Request not found' } };
    }

    const isCivilian = user.id === existingRequest.civilian_id;
    const isAssignedHero = user.id === existingRequest.hero_id;

    if (!isCivilian && !isAssignedHero) {
      return { data: null, error: { message: 'Unauthorized: You cannot update this request' } };
    }

    const allowedFields = ['hero_id', 'status'];
    const sanitizedUpdates = Object.keys(updates)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    sanitizedUpdates.updated_at = new Date().toISOString();

    // ✅ Business logic for status transitions
    if (sanitizedUpdates.status) {
      const validStatuses = ['pending', 'assigned', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(sanitizedUpdates.status)) {
        return { data: null, error: { message: 'Invalid status value' } };
      }

      if (sanitizedUpdates.status === 'completed' && !isAssignedHero) {
        return { data: null, error: { message: 'Only the assigned hero can complete the request' } };
      }

      if (sanitizedUpdates.status === 'cancelled' && !isCivilian) {
        return { data: null, error: { message: 'Only the civilian can cancel the request' } };
      }
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update(sanitizedUpdates)
      .eq('id', requestId)
      .select()
      .single();

    return { data, error };
  },   

  // Get all available requests for heroes (all pending requests with no hero assigned)
  getAvailableRequests: async () => {
    logger.supabaseQuery('select', 'service_requests', { status: 'pending', hero_id: null });
    
    const startTime = Date.now();
    // ✅ CRITICAL FIX: Only show requests that are pending AND have no hero assigned
    const { data, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        civilian:profiles!civilian_id (
          full_name
        )
      `)
      .eq('status', 'pending')
      .is('hero_id', null)  // ✅ Only truly available requests
      .order('created_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('getAvailableRequests', !error, data, error);
    logger.performance('db.getAvailableRequests', duration);
    
    return { data, error };
  },

  // Heroes discovery
  getAvailableHeroes: async (filters?: { skills?: string[]; minRating?: number; maxRate?: number }) => {
    // Create cache key based on filters
    const cacheKey = `getAvailableHeroes:${JSON.stringify(filters || {})}`;
    
    // Return cached promise if request is already in flight
    const cachedRequest = requestCache.get(cacheKey);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request = (async () => {
      // ✅ SCHEMA COMPLIANCE: Join through public.profiles, not auth.users
      let query = supabase
        .from('hero_profiles')
        .select(`
          *,
          profiles!inner (
            id,
            full_name,
            phone
          )
        `);

      if (filters?.skills) {
        query = query.overlaps('skills', filters.skills);
      }

      if (filters?.minRating) {
        query = query.gte('rating', filters.minRating);
      }

      if (filters?.maxRate) {
        query = query.lte('hourly_rate', filters.maxRate);
      }

      const { data, error } = await query.order('rating', { ascending: false });
      
      // Remove from cache after completion
      requestCache.delete(cacheKey);
      return { data, error };
    })();

    requestCache.set(cacheKey, request);
    return request;
  },

  // Chat messages
  getChatMessages: async (requestId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    return { data, error };
  },

  sendChatMessage: async (message: any) => {
    // Support both 'message' and 'content' field names for compatibility
    const messageText = message.message || message.content;
    
    // Validate message content
    if (!messageText || typeof messageText !== 'string') {
      return { data: null, error: { message: 'Message text is required' } };
    }
    
    if (!message.sender_id || !message.request_id) {
      return { data: null, error: { message: 'Sender ID and request ID are required' } };
    }
    
    // Sanitize message content (XSS prevention)
    const sanitizedContent = messageText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
    
    if (sanitizedContent.length === 0) {
      return { data: null, error: { message: 'Message cannot be empty' } };
    }
    
    if (sanitizedContent.length > 1000) {
      return { data: null, error: { message: 'Message is too long (max 1000 characters)' } };
    }
    
    // Use correct field name matching database schema
    const sanitizedMessage = {
      request_id: message.request_id,
      sender_id: message.sender_id,
      message: sanitizedContent, // Database expects 'message' field, not 'content'
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(sanitizedMessage)
      .select()
      .single();
    return { data, error };
  },

  // Request acceptances
  acceptRequest: async (requestId: string, heroUserId: string) => {
    logger.supabaseQuery('insert', 'request_acceptances', { requestId, heroUserId });
    
    // Validate inputs
    if (!requestId || !heroUserId) {
      return { data: null, error: { message: 'Request ID and Hero User ID are required' } };
    }

    // Verify authenticated user matches heroUserId (profiles.id)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== heroUserId) {
      logger.warn('acceptRequest: Unauthorized access attempt', { heroUserId, authenticatedUserId: user?.id });
      return { data: null, error: { message: 'Unauthorized: You can only accept requests as yourself' } };
    }

    // ✅ MAPPING LAYER: Map profiles.id → hero_profiles.id for database storage
    const { data: heroProfile, error: heroError } = await supabase
      .from('hero_profiles')
      .select('id')
      .eq('profile_id', heroUserId)
      .maybeSingle();

    if (heroError || !heroProfile) {
      logger.warn('acceptRequest: Hero profile not found', { heroUserId, error: heroError });
      return { data: null, error: { message: 'Hero profile not found. Please complete your hero profile setup.' } };
    }

    // Check if request is still pending
    const { data: request, error: requestError } = await supabase
      .from('service_requests')
      .select('status')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError || !request) {
      return { data: null, error: { message: 'Request not found' } };
    }

    if (request.status !== 'pending') {
      return { data: null, error: { message: 'Request is no longer available' } };
    }

    // Check if hero already accepted this request
    const { data: existingAcceptance, error: existingError } = await supabase
      .from('request_acceptances')
      .select('id')
      .eq('request_id', requestId)
      .eq('hero_id', heroProfile.id)
      .maybeSingle();

    if (existingAcceptance) {
      return { data: null, error: { message: 'You have already expressed interest in this request' } };
    }

    const startTime = Date.now();
    // ✅ BACKEND ONLY: Store hero_profiles.id in database
    const { data, error } = await supabase
      .from('request_acceptances')
      .insert({
        request_id: requestId,
        hero_id: heroProfile.id, // Backend stores hero_profiles.id
        accepted_at: new Date().toISOString(),
        chosen: false
      })
      .select()
      .maybeSingle();
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('acceptRequest', !error, data, error);
    logger.performance('db.acceptRequest', duration);
    
    return { data, error };
  },

  getRequestAcceptances: async (requestId: string) => {
    logger.supabaseQuery('select', 'request_acceptances', { requestId });
    
    if (!requestId) {
      return { data: null, error: { message: 'Request ID is required' } };
    }

    const startTime = Date.now();
    // ✅ MAPPING LAYER: Join through hero_profiles to get profiles data
    const { data, error } = await supabase
      .from('request_acceptances')
      .select(`
        *,
        hero_profiles!inner (
          profile_id,
          skills,
          hourly_rate,
          rating,
          completed_jobs,
          profile_image_url,
          profiles!inner (
            id,
            full_name,
            phone
          )
        )
      `)
      .eq('request_id', requestId)
      .order('accepted_at', { ascending: false });
    
    const duration = Date.now() - startTime;
    logger.supabaseResult('getRequestAcceptances', !error, data, error);
    logger.performance('db.getRequestAcceptances', duration);
    
    // ✅ MAPPING LAYER: Transform to frontend-safe structure
    // NEVER expose hero_profiles.id to frontend
    if (data && Array.isArray(data)) {
      const transformedData = data.map((acceptance: any) => ({
        id: acceptance.id,
        request_id: acceptance.request_id,
        profileId: acceptance.hero_profiles?.profile_id, // ✅ Expose profiles.id only
        accepted_at: acceptance.accepted_at,
        chosen: acceptance.chosen,
        hero: {
          profileId: acceptance.hero_profiles?.profile_id, // ✅ profiles.id
          fullName: acceptance.hero_profiles?.profiles?.full_name || 'Unknown',
          phone: acceptance.hero_profiles?.profiles?.phone || '',
          skills: acceptance.hero_profiles?.skills || [],
          hourlyRate: acceptance.hero_profiles?.hourly_rate || 0,
          rating: acceptance.hero_profiles?.rating || 0,
          completedJobs: acceptance.hero_profiles?.completed_jobs || 0,
          profileImageUrl: acceptance.hero_profiles?.profile_image_url || null,
        }
      }));
      return { data: transformedData, error: null };
    }
    
    return { data, error };
  },

  chooseHero: async (requestId: string, profileId: string, civilianId: string) => {
    logger.supabaseQuery('update', 'request_acceptances', { requestId, profileId });
    
    // Validate inputs
    if (!requestId || !profileId || !civilianId) {
      return { data: null, error: { message: 'Request ID, Profile ID, and Civilian ID are required' } };
    }

    // Verify authenticated user matches civilianId
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== civilianId) {
      logger.warn('chooseHero: Unauthorized access attempt', { civilianId, authenticatedUserId: user?.id });
      return { data: null, error: { message: 'Unauthorized: You can only choose heroes for your own requests' } };
    }

    const startTime = Date.now();
    
    // ✅ MAPPING LAYER: Map profiles.id → hero_profiles.id for database update
    const { data: heroProfile, error: heroError } = await supabase
      .from('hero_profiles')
      .select('id, profile_id')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (heroError || !heroProfile) {
      logger.warn('chooseHero: Hero profile not found', { profileId, error: heroError });
      return { data: null, error: { message: 'Hero profile not found' } };
    }

    // Mark chosen hero using hero_profiles.id (backend only)
    const { data: chosenAcceptance, error: chooseError } = await supabase
      .from('request_acceptances')
      .update({ chosen: true })
      .eq('request_id', requestId)
      .eq('hero_id', heroProfile.id) // Backend uses hero_profiles.id
      .select('*')
      .maybeSingle();

    if (chooseError || !chosenAcceptance) {
      return { data: null, error: chooseError || { message: 'Failed to choose hero' } };
    }

    // Update service_requests with profiles.id
    const { data: updatedRequest, error: updateError } = await supabase
      .from('service_requests')
      .update({
        status: 'assigned',
        hero_id: profileId, // service_requests uses profiles.id
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .maybeSingle();

    if (updateError) {
      // Rollback the acceptance choice
      await supabase
        .from('request_acceptances')
        .update({ chosen: false })
        .eq('request_id', requestId)
        .eq('hero_id', heroProfile.id);
      
      return { data: null, error: updateError };
    }

    const duration = Date.now() - startTime;
    logger.supabaseResult('chooseHero', !updateError, updatedRequest, updateError);
    logger.performance('db.chooseHero', duration);
    
    return { data: updatedRequest, error: null };
  },

  // Earnings
  getHeroEarnings: async (heroId: string, startDate?: string, endDate?: string) => {
    let query = supabase
      .from('service_requests')
      .select('*')
      .eq('hero_id', heroId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (startDate) {
      query = query.gte('updated_at', startDate);
    }

    if (endDate) {
      query = query.lte('updated_at', endDate);
    }

    const { data, error } = await query;
    return { data, error };
  },
};

// Real-time types for type safety
export interface RealtimeServiceRequestPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ServiceRequest | null;
  old: ServiceRequest | null;
  errors: string[] | null;
}

export interface RealtimeChatPayload {
  eventType: 'INSERT';
  new: ChatMessage;
  old: null;
  errors: string[] | null;
}

export interface RealtimeSubscriptionOptions {
  debounceMs?: number;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

// Real-time helper functions with proper error handling and type safety
export const realtime = {
  /**
   * Subscribe to service request changes for a specific user
   * @param userId - The user ID to filter by
   * @param userType - Whether the user is a civilian or hero
   * @param callback - Function to call when changes occur
   * @param options - Optional configuration (debounce, error handling)
   * @returns Subscription object or null if failed
   */
  subscribeToServiceRequests: async (
    userId: string,
    userType: 'civilian' | 'hero',
    callback: (payload: RealtimeServiceRequestPayload) => void,
    options?: RealtimeSubscriptionOptions
  ) => {
    try {
      // Validate user session
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user || user.id !== userId) {
        console.error('[Realtime] Invalid user session for subscription');
        options?.onError?.('Authentication required for real-time updates');
        return null;
      }

      const column = userType === 'civilian' ? 'civilian_id' : 'hero_id';
      
      // Wrap callback with error handling
      const safeCallback = (payload: any) => {
        try {
          callback(payload as RealtimeServiceRequestPayload);
        } catch (error) {
          console.error('[Realtime] Callback error:', error);
          options?.onError?.('Failed to process real-time update');
        }
      };

      const subscription = supabase
        .channel(`service_requests:${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'service_requests',
            filter: `${column}=eq.${userId}`
          },
          safeCallback
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('[Realtime] Subscription error:', err);
            options?.onError?.('Failed to establish real-time connection');
          } else if (status === 'SUBSCRIBED') {
            if (__DEV__) {
              console.log(`[Realtime] Successfully subscribed to service_requests for ${userType} ${userId}`);
            }
          }
          options?.onStatusChange?.(status);
        });
      
      return subscription;
    } catch (error) {
      console.error('[Realtime] Subscription setup failed:', error);
      options?.onError?.('Failed to set up real-time connection');
      return null;
    }
  },

  /**
   * Subscribe to chat messages for a specific request
   * @param requestId - The request ID to filter by
   * @param callback - Function to call when new messages arrive
   * @param options - Optional configuration (error handling)
   * @returns Subscription object or null if failed
   */
  subscribeToChat: async (
    requestId: string,
    callback: (payload: RealtimeChatPayload) => void,
    options?: RealtimeSubscriptionOptions
  ) => {
    try {
      // Validate user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('[Realtime] Invalid user session for chat subscription');
        options?.onError?.('Authentication required for chat updates');
        return null;
      }

      // Wrap callback with error handling
      const safeCallback = (payload: any) => {
        try {
          callback(payload as RealtimeChatPayload);
        } catch (error) {
          console.error('[Realtime] Chat callback error:', error);
          options?.onError?.('Failed to process chat message');
        }
      };

      const subscription = supabase
        .channel(`chat:${requestId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `request_id=eq.${requestId}`
          },
          safeCallback
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIPTION_ERROR') {
            console.error('[Realtime] Chat subscription error:', err);
            options?.onError?.('Failed to establish chat connection');
          } else if (status === 'SUBSCRIBED') {
            if (__DEV__) {
              console.log(`[Realtime] Successfully subscribed to chat for request ${requestId}`);
            }
          }
          options?.onStatusChange?.(status);
        });
      
      return subscription;
    } catch (error) {
      console.error('[Realtime] Chat subscription setup failed:', error);
      options?.onError?.('Failed to set up chat connection');
      return null;
    }
  },

  /**
   * Unsubscribe from a realtime channel
   * @param channel - The channel to unsubscribe from
   */
  unsubscribe: (channel: any) => {
    if (!channel) return;
    
    try {
      supabase.removeChannel(channel);
      if (__DEV__) {
        console.log('[Realtime] Successfully unsubscribed');
      }
    } catch (error) {
      console.error('[Realtime] Error unsubscribing:', error);
    }
  }
};
