// Database type definitions for Supabase
// CRITICAL: This schema must match the actual Supabase database structure
// See .kiro/steering/g.md for canonical schema rules

// Typed JSON structures
export interface NotificationPreferences {
  push_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  request_updates: boolean;
  chat_messages: boolean;
  marketing: boolean;
}

export interface AvailabilitySchedule {
  monday: { start: string; end: string; available: boolean };
  tuesday: { start: string; end: string; available: boolean };
  wednesday: { start: string; end: string; available: boolean };
  thursday: { start: string; end: string; available: boolean };
  friday: { start: string; end: string; available: boolean };
  saturday: { start: string; end: string; available: boolean };
  sunday: { start: string; end: string; available: boolean };
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

// Wallet transaction types
export type TransactionType = 'cash_job_fee' | 'in_app_payment' | 'withdrawal' | 'fee_top_up' | 'refund' | 'adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type WalletType = 'earnings' | 'fee';

export interface Database {
  public: {
    Tables: {
      // Canonical user profile table (source of truth)
      // FK: id → auth.users.id (1:1 relationship)
      // RLS: Users can only access their own profile (auth.uid() = id)
      profiles: {
        Row: {
          id: string;
          role: 'civilian' | 'hero';
          full_name: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          /** REQUIRED: Must match auth.users.id exactly */
          id: string;
          /** REQUIRED: Must be set during signup */
          role: 'civilian' | 'hero';
          full_name?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: 'civilian' | 'hero';
          full_name?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      
      // Civilian-specific profile data
      // FK: profile_id → profiles.id
      // RLS: Only accessible when auth.uid() = profile_id
      civilian_profiles: {
        Row: {
          id: string;
          /** FK: profiles.id - CRITICAL: Query using .eq('profile_id', userId) */
          profile_id: string;
          /** Civilian address - optional during onboarding */
          address: string | null;
          notification_preferences: NotificationPreferences | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** REQUIRED: Must match authenticated user's profiles.id */
          profile_id: string;
          address?: string | null;
          notification_preferences?: NotificationPreferences | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          notification_preferences?: NotificationPreferences | null;
          updated_at?: string;
        };
      };
      
      // Hero-specific profile data
      // FK: profile_id → profiles.id
      // RLS: Public read access, heroes can only update their own
      hero_profiles: {
        Row: {
          id: string;
          /** FK: profiles.id - CRITICAL: Query using .eq('profile_id', userId) */
          profile_id: string;
          /** REQUIRED: Min 1 skill for job acceptance */
          skills: string[];
          /** REQUIRED: Hourly rate in USD. Min: 10, Max: 500 */
          hourly_rate: number;
          availability: AvailabilitySchedule | null;
          /** Rating 0-5, calculated from reviews */
          rating: number;
          /** Total completed jobs count */
          completed_jobs: number;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** REQUIRED: Must match authenticated user's profiles.id */
          profile_id: string;
          /** REQUIRED: Must have at least 1 skill */
          skills: string[];
          /** REQUIRED: Must be between 10-500 USD */
          hourly_rate: number;
          availability?: AvailabilitySchedule | null;
          rating?: number;
          completed_jobs?: number;
          profile_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          skills?: string[];
          hourly_rate?: number;
          availability?: AvailabilitySchedule | null;
          rating?: number;
          completed_jobs?: number;
          profile_image_url?: string | null;
          updated_at?: string;
        };
      };
      
      // Service requests (jobs)
      // RLS: Civilians can access their own, heroes can access assigned ones
      service_requests: {
        Row: {
          id: string;
          /** FK: profiles.id (civilian who created request) */
          civilian_id: string;
          /** FK: profiles.id (assigned hero) */
          hero_id: string | null;
          /** REQUIRED: Min 5 chars, max 100 chars */
          title: string;
          /** REQUIRED: Min 10 chars, max 1000 chars */
          description: string;
          category: 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other';
          location: Location;
          /** REQUIRED: Must be future date */
          scheduled_date: string;
          /** Duration in hours (1-24) */
          estimated_duration: number;
          budget_range: BudgetRange;
          status: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          /** REQUIRED: Must match authenticated civilian's profiles.id */
          civilian_id: string;
          hero_id?: string | null;
          title: string;
          description: string;
          category: 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other';
          location: Location;
          scheduled_date: string;
          estimated_duration: number;
          budget_range: BudgetRange;
          status?: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hero_id?: string | null;
          title?: string;
          description?: string;
          category?: 'cleaning' | 'repairs' | 'delivery' | 'tutoring' | 'other';
          location?: Location;
          scheduled_date?: string;
          estimated_duration?: number;
          budget_range?: BudgetRange;
          status?: 'pending' | 'assigned' | 'active' | 'completed' | 'cancelled';
          updated_at?: string;
        };
      };
      
      // Chat messages between civilians and heroes
      // RLS: Only participants in the request can access
      chat_messages: {
        Row: {
          id: string;
          /** FK: service_requests.id */
          request_id: string;
          /** FK: profiles.id (message sender) */
          sender_id: string;
          /** REQUIRED: Max 1000 chars, XSS sanitized */
          message: string;
          delivered: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          /** REQUIRED: Must match authenticated user's profiles.id */
          sender_id: string;
          message: string;
          delivered?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          delivered?: boolean;
          read_at?: string | null;
        };
      };
      
      // Hero interest in jobs (for matching system)
      // RLS: Heroes can access their own, civilians can see for their requests
      job_interest: {
        Row: {
          id: string;
          /** FK: service_requests.id */
          job_id: string;
          /** FK: profiles.id (hero expressing interest) */
          hero_user_id: string;
          source: 'app' | 'sms';
          status: 'interested' | 'withdrawn' | 'selected' | 'rejected';
          /** Phone number for SMS source (masked in UI) */
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          /** REQUIRED: Must match authenticated hero's profiles.id */
          hero_user_id: string;
          source?: 'app' | 'sms';
          status?: 'interested' | 'withdrawn' | 'selected' | 'rejected';
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'interested' | 'withdrawn' | 'selected' | 'rejected';
          updated_at?: string;
        };
      };
      
      // Request acceptances (heroes accepting requests)
      // RLS: Only accessible by request participants
      request_acceptances: {
        Row: {
          id: string;
          /** FK: service_requests.id */
          request_id: string;
          /** FK: hero_profiles.id - BACKEND ONLY, never exposed to frontend */
          hero_id: string;
          accepted_at: string;
          chosen: boolean;
        };
        Insert: {
          id?: string;
          request_id: string;
          /** BACKEND ONLY: References hero_profiles.id internally */
          hero_id: string;
          accepted_at?: string;
          chosen?: boolean;
        };
        Update: {
          chosen?: boolean;
        };
      };
      
      // Hero wallets for dual-balance system
      // RLS: Heroes can only access their own wallet
      hero_wallets: {
        Row: {
          id: string;
          /** FK: profiles.id */
          profile_id: string;
          /** Earnings balance (hero-controlled, cannot go negative) */
          earnings_balance: number;
          /** Fee balance (platform-controlled, can go negative) */
          fee_balance: number;
          /** Minimum fee balance threshold */
          fee_threshold: number;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          identity_verified: boolean;
          identity_verified_at: string | null;
          last_withdrawal_at: string | null;
          withdrawal_cooldown_hours: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          earnings_balance?: number;
          fee_balance?: number;
          fee_threshold?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          identity_verified?: boolean;
          identity_verified_at?: string | null;
          last_withdrawal_at?: string | null;
          withdrawal_cooldown_hours?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          earnings_balance?: number;
          fee_balance?: number;
          fee_threshold?: number;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          identity_verified?: boolean;
          identity_verified_at?: string | null;
          last_withdrawal_at?: string | null;
          withdrawal_cooldown_hours?: number;
          updated_at?: string;
        };
      };
      
      // Wallet transactions ledger
      // RLS: Heroes can only view their own transactions
      wallet_transactions: {
        Row: {
          id: string;
          /** FK: hero_wallets.id */
          wallet_id: string;
          type: TransactionType;
          amount: number;
          wallet_type: WalletType;
          description: string;
          status: TransactionStatus;
          /** FK: service_requests.id */
          service_request_id: string | null;
          earnings_balance_after: number | null;
          fee_balance_after: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          type: TransactionType;
          amount: number;
          wallet_type: WalletType;
          description: string;
          status?: TransactionStatus;
          service_request_id?: string | null;
          earnings_balance_after?: number | null;
          fee_balance_after?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: TransactionStatus;
          earnings_balance_after?: number | null;
          fee_balance_after?: number | null;
          updated_at?: string;
        };
      };
      
      // Withdrawal requests
      // RLS: Heroes can view/create their own requests
      withdrawal_requests: {
        Row: {
          id: string;
          /** FK: hero_wallets.id */
          wallet_id: string;
          amount: number;
          status: TransactionStatus;
          bank_name: string;
          bank_account_number: string;
          bank_account_holder: string;
          requested_at: string;
          processed_at: string | null;
          completed_at: string | null;
          failed_at: string | null;
          failure_reason: string | null;
          /** FK: wallet_transactions.id */
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wallet_id: string;
          amount: number;
          status?: TransactionStatus;
          bank_name: string;
          bank_account_number: string;
          bank_account_holder: string;
          requested_at?: string;
          processed_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          failure_reason?: string | null;
          transaction_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: TransactionStatus;
          processed_at?: string | null;
          completed_at?: string | null;
          failed_at?: string | null;
          failure_reason?: string | null;
          transaction_id?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}