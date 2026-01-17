import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

export interface HeroWallet {
  id: string;
  profile_id: string;
  earnings_balance: number;
  fee_balance: number;
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
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: 'cash_job_fee' | 'in_app_payment' | 'withdrawal' | 'fee_top_up' | 'refund' | 'adjustment';
  amount: number;
  wallet_type: 'earnings' | 'fee';
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  service_request_id: string | null;
  earnings_balance_after: number | null;
  fee_balance_after: number | null;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  wallet_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  requested_at: string;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WalletState {
  wallet: HeroWallet | null;
  transactions: WalletTransaction[];
  withdrawalRequests: WithdrawalRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadWallet: (profileId: string) => Promise<void>;
  loadTransactions: (walletId: string, filters?: TransactionFilters) => Promise<void>;
  loadWithdrawalRequests: (walletId: string) => Promise<void>;
  updateBankDetails: (walletId: string, bankDetails: BankDetails) => Promise<void>;
  requestWithdrawal: (walletId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  canWithdraw: () => { allowed: boolean; reason?: string };
  canAcceptJobs: () => boolean;
  clearWallet: () => void;
  refreshWallet: (profileId: string) => Promise<void>;
}

export interface TransactionFilters {
  type?: 'all' | 'earnings' | 'fees' | 'payouts';
  startDate?: string;
  endDate?: string;
}

export interface BankDetails {
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallet: null,
      transactions: [],
      withdrawalRequests: [],
      isLoading: false,
      error: null,

      loadWallet: async (profileId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          logger.supabaseQuery('select', 'hero_wallets', { profileId });
          
          const { data, error } = await supabase
            .from('hero_wallets')
            .select('*')
            .eq('profile_id', profileId)
            .maybeSingle();
          
          if (error) {
            logger.error('Failed to load wallet', error);
            set({ error: error.message, isLoading: false });
            return;
          }
          
          if (!data) {
            // Wallet doesn't exist yet - this is normal for new heroes
            logger.info('No wallet found for hero', { profileId });
            set({ wallet: null, isLoading: false });
            return;
          }
          
          set({ wallet: data, isLoading: false });
        } catch (error: any) {
          logger.error('Exception loading wallet', error);
          set({ error: 'Failed to load wallet', isLoading: false });
        }
      },

      loadTransactions: async (walletId: string, filters?: TransactionFilters) => {
        set({ isLoading: true, error: null });
        
        try {
          logger.supabaseQuery('select', 'wallet_transactions', { walletId, filters });
          
          let query = supabase
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false });
          
          // Apply filters
          if (filters?.type && filters.type !== 'all') {
            if (filters.type === 'earnings') {
              query = query.eq('wallet_type', 'earnings');
            } else if (filters.type === 'fees') {
              query = query.eq('wallet_type', 'fee');
            } else if (filters.type === 'payouts') {
              query = query.eq('type', 'withdrawal');
            }
          }
          
          if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate);
          }
          
          if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate);
          }
          
          const { data, error } = await query;
          
          if (error) {
            logger.error('Failed to load transactions', error);
            set({ error: error.message, isLoading: false });
            return;
          }
          
          set({ transactions: data || [], isLoading: false });
        } catch (error: any) {
          logger.error('Exception loading transactions', error);
          set({ error: 'Failed to load transactions', isLoading: false });
        }
      },

      loadWithdrawalRequests: async (walletId: string) => {
        try {
          logger.supabaseQuery('select', 'withdrawal_requests', { walletId });
          
          const { data, error } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .eq('wallet_id', walletId)
            .order('requested_at', { ascending: false });
          
          if (error) {
            logger.error('Failed to load withdrawal requests', error);
            return;
          }
          
          set({ withdrawalRequests: data || [] });
        } catch (error: any) {
          logger.error('Exception loading withdrawal requests', error);
        }
      },

      updateBankDetails: async (walletId: string, bankDetails: BankDetails) => {
        set({ isLoading: true, error: null });
        
        try {
          logger.supabaseQuery('update', 'hero_wallets', { walletId });
          
          const { data, error } = await supabase
            .from('hero_wallets')
            .update({
              bank_name: bankDetails.bank_name,
              bank_account_number: bankDetails.bank_account_number,
              bank_account_holder: bankDetails.bank_account_holder,
              updated_at: new Date().toISOString()
            })
            .eq('id', walletId)
            .select()
            .single();
          
          if (error) {
            logger.error('Failed to update bank details', error);
            set({ error: error.message, isLoading: false });
            return;
          }
          
          set({ wallet: data, isLoading: false });
        } catch (error: any) {
          logger.error('Exception updating bank details', error);
          set({ error: 'Failed to update bank details', isLoading: false });
        }
      },

      requestWithdrawal: async (walletId: string, amount: number) => {
        const { wallet, canWithdraw } = get();
        
        if (!wallet) {
          return { success: false, error: 'Wallet not loaded' };
        }
        
        // Validate withdrawal eligibility
        const eligibility = canWithdraw();
        if (!eligibility.allowed) {
          return { success: false, error: eligibility.reason };
        }
        
        // Validate amount
        if (amount <= 0) {
          return { success: false, error: 'Amount must be greater than zero' };
        }
        
        if (amount > wallet.earnings_balance) {
          return { success: false, error: 'Insufficient balance' };
        }
        
        // Validate bank details
        if (!wallet.bank_account_number || !wallet.bank_account_holder) {
          return { success: false, error: 'Please add bank account details first' };
        }
        
        set({ isLoading: true, error: null });
        
        try {
          logger.supabaseQuery('insert', 'withdrawal_requests', { walletId, amount });
          
          const { data, error } = await supabase
            .from('withdrawal_requests')
            .insert({
              wallet_id: walletId,
              amount,
              bank_name: wallet.bank_name || 'Bank Windhoek',
              bank_account_number: wallet.bank_account_number,
              bank_account_holder: wallet.bank_account_holder,
              status: 'pending'
            })
            .select()
            .single();
          
          if (error) {
            logger.error('Failed to create withdrawal request', error);
            set({ isLoading: false, error: error.message });
            return { success: false, error: error.message };
          }
          
          // Reload wallet and transactions
          await get().refreshWallet(wallet.profile_id);
          
          set({ isLoading: false });
          return { success: true };
        } catch (error: any) {
          logger.error('Exception creating withdrawal request', error);
          set({ isLoading: false, error: 'Failed to create withdrawal request' });
          return { success: false, error: 'Failed to create withdrawal request' };
        }
      },

      canWithdraw: () => {
        const { wallet } = get();
        
        if (!wallet) {
          return { allowed: false, reason: 'Wallet not loaded' };
        }
        
        if (wallet.earnings_balance <= 0) {
          return { allowed: false, reason: 'No funds available to withdraw' };
        }
        
        if (!wallet.identity_verified) {
          return { allowed: false, reason: 'Identity verification required' };
        }
        
        if (!wallet.bank_account_number || !wallet.bank_account_holder) {
          return { allowed: false, reason: 'Bank account details required' };
        }
        
        // Check withdrawal cooldown
        if (wallet.last_withdrawal_at) {
          const lastWithdrawal = new Date(wallet.last_withdrawal_at);
          const cooldownEnd = new Date(lastWithdrawal.getTime() + wallet.withdrawal_cooldown_hours * 60 * 60 * 1000);
          const now = new Date();
          
          if (now < cooldownEnd) {
            const hoursRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / (60 * 60 * 1000));
            return { allowed: false, reason: `Withdrawal cooldown active. Try again in ${hoursRemaining} hours` };
          }
        }
        
        return { allowed: true };
      },

      canAcceptJobs: () => {
        const { wallet } = get();
        
        if (!wallet) {
          return false;
        }
        
        // Hero can accept jobs if fee balance is above threshold
        return wallet.fee_balance >= wallet.fee_threshold;
      },

      refreshWallet: async (profileId: string) => {
        const { loadWallet, wallet } = get();
        await loadWallet(profileId);
        
        if (wallet) {
          await get().loadTransactions(wallet.id);
          await get().loadWithdrawalRequests(wallet.id);
        }
      },

      clearWallet: () => {
        set({
          wallet: null,
          transactions: [],
          withdrawalRequests: [],
          error: null,
          isLoading: false
        });
      },
    }),
    {
      name: 'wallet-storage',
      partialize: (state) => ({
        // Don't persist sensitive data
      }),
    }
  )
);
