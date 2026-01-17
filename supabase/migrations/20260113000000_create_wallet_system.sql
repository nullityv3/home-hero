-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- DUAL-BALANCE WALLET SYSTEM FOR HEROES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fee Wallet: Platform-controlled, can go negative
-- Earnings Wallet: Hero-controlled, cannot go negative
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create wallet table for heroes
CREATE TABLE IF NOT EXISTS public.hero_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Earnings Wallet (hero-controlled, cannot go negative)
  earnings_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (earnings_balance >= 0),
  
  -- Fee Wallet (platform-controlled, can go negative)
  fee_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Minimum fee balance threshold before job acceptance is blocked
  fee_threshold DECIMAL(10, 2) NOT NULL DEFAULT -100.00,
  
  -- Bank account details for withdrawals
  bank_name TEXT DEFAULT 'Bank Windhoek',
  bank_account_number TEXT,
  bank_account_holder TEXT,
  
  -- Identity verification status
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  identity_verified_at TIMESTAMPTZ,
  
  -- Withdrawal cooldown
  last_withdrawal_at TIMESTAMPTZ,
  withdrawal_cooldown_hours INTEGER NOT NULL DEFAULT 24,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one wallet per hero
  UNIQUE(profile_id)
);

-- Create transaction types enum
CREATE TYPE transaction_type AS ENUM (
  'cash_job_fee',
  'in_app_payment',
  'withdrawal',
  'fee_top_up',
  'refund',
  'adjustment'
);

-- Create transaction status enum
CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'cancelled'
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.hero_wallets(id) ON DELETE CASCADE,
  
  -- Transaction details
  type transaction_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  
  -- Which wallet was affected
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('earnings', 'fee')),
  
  -- Transaction metadata
  description TEXT NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Related entities
  service_request_id UUID REFERENCES public.service_requests(id) ON DELETE SET NULL,
  
  -- Balances after transaction (for audit trail)
  earnings_balance_after DECIMAL(10, 2),
  fee_balance_after DECIMAL(10, 2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create withdrawal requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.hero_wallets(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Bank details (snapshot at time of withdrawal)
  bank_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_account_holder TEXT NOT NULL,
  
  -- Processing details
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  
  -- Reference to transaction record
  transaction_id UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_hero_wallets_profile_id ON public.hero_wallets(profile_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX idx_withdrawal_requests_wallet_id ON public.withdrawal_requests(wallet_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Enable Row Level Security
ALTER TABLE public.hero_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hero_wallets
CREATE POLICY "Heroes can view their own wallet"
  ON public.hero_wallets FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Heroes can update their own wallet bank details"
  ON public.hero_wallets FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- RLS Policies for wallet_transactions
CREATE POLICY "Heroes can view their own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM public.hero_wallets WHERE profile_id = auth.uid()
    )
  );

-- RLS Policies for withdrawal_requests
CREATE POLICY "Heroes can view their own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM public.hero_wallets WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Heroes can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (
    wallet_id IN (
      SELECT id FROM public.hero_wallets WHERE profile_id = auth.uid()
    )
  );

-- Function to automatically create wallet when hero profile is created
CREATE OR REPLACE FUNCTION create_hero_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.hero_wallets (profile_id)
  VALUES (NEW.profile_id)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create wallet on hero profile creation
CREATE TRIGGER on_hero_profile_created
  AFTER INSERT ON public.hero_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_hero_wallet();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_hero_wallets_updated_at
  BEFORE UPDATE ON public.hero_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create wallets for existing heroes
INSERT INTO public.hero_wallets (profile_id)
SELECT profile_id FROM public.hero_profiles
ON CONFLICT (profile_id) DO NOTHING;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.hero_wallets TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
