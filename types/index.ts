// Core user types - matches Supabase auth.users structure
export interface User {
  id: string;
  email: string;
  user_type: 'civilian' | 'hero';  // Direct access for convenience
  user_metadata?: {                // Optional fallback
    user_type?: 'civilian' | 'hero';
    [key: string]: any;            // Allow other metadata
  };
  created_at: string;
  updated_at: string;
}

// Core profile table - canonical user identity (public.profiles)
export interface Profile {
  id: string;                    // Primary key, references auth.users.id
  role: 'civilian' | 'hero';
  full_name: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
}

// Service categories with strict typing
export type ServiceCategory = 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other';

// Request status type
export type RequestStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';

// Location interface for better type safety
export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

// Budget range with currency support
export interface BudgetRange {
  min: number;
  max: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

// Notification settings
export interface NotificationSettings {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  request_updates: boolean;
  chat_messages: boolean;
  marketing: boolean;
}

// Availability schedule for heroes
export interface AvailabilitySchedule {
  monday: { start: string; end: string; available: boolean };
  tuesday: { start: string; end: string; available: boolean };
  wednesday: { start: string; end: string; available: boolean };
  thursday: { start: string; end: string; available: boolean };
  friday: { start: string; end: string; available: boolean };
  saturday: { start: string; end: string; available: boolean };
  sunday: { start: string; end: string; available: boolean };
}

// Civilian profile matching Supabase schema (g.md rules)
// CRITICAL: 'id' is the PRIMARY KEY (auto-generated)
// CRITICAL: 'profile_id' is the FOREIGN KEY to public.profiles.id (THIS IS THE USER ID)
// ALWAYS query using .eq('profile_id', userId), NEVER .eq('id', userId)
// full_name and phone belong ONLY in public.profiles, not here
export interface CivilianProfile {
  id: string;                    // Primary key (auto-generated)
  profile_id: string;            // Foreign key to profiles.id (USER IDENTIFIER)
  address: string | null;        // Civilian-specific field only
  notification_preferences?: NotificationSettings;
  created_at?: string;
  updated_at?: string;
}

// Hero profile matching Supabase schema (g.md rules)
// CRITICAL: 'id' is the PRIMARY KEY (auto-generated)
// CRITICAL: 'profile_id' is the FOREIGN KEY to public.profiles.id (THIS IS THE USER ID)
// ALWAYS query using .eq('profile_id', userId), NEVER .eq('id', userId)
// full_name and phone belong ONLY in public.profiles, not here
export interface HeroProfile {
  id: string;                    // Primary key (auto-generated)
  profile_id: string;            // Foreign key to profiles.id (USER IDENTIFIER)
  skills: string[];              // Hero-specific fields only
  hourly_rate: number;
  rating: number;
  completed_jobs: number;
  profile_image_url: string | null;
  availability?: AvailabilitySchedule;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceRequest {
  id: string;
  civilian_id: string;
  hero_id?: string;
  title: string;
  description: string;
  category: ServiceCategory;
  location: Location;
  scheduled_date: string;
  estimated_duration: number;
  budget_range: BudgetRange;
  status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Chat message matching Supabase schema
export interface ChatMessage {
  id: string;
  request_id: string;
  sender_id: string;
  message: string;
  read_at?: string | null;
  delivered?: boolean;
  temp?: boolean;  // For optimistic updates
  failed?: boolean;  // For failed message retry
  created_at: string;
}

// Earnings types
export type EarningsTimeframe = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface EarningsPeriod {
  date: string;
  amount: number;
  jobCount?: number;
}

export interface EarningsData {
  totalEarnings: number;
  completedJobs: number;
  averageRating: number;
  dailyEarnings: EarningsPeriod[];
  weeklyEarnings: EarningsPeriod[];
  monthlyEarnings: EarningsPeriod[];
}

// Validation and result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

// Enum constants for type safety
export const SERVICE_CATEGORIES = ['cleaning', 'repairs', 'delivery', 'tutoring', 'other'] as const;
export const REQUEST_STATUSES = ['pending', 'assigned', 'active', 'completed', 'cancelled'] as const;
export const USER_ROLES = ['civilian', 'hero'] as const;