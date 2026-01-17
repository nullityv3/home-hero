# Wallet Backend Integration - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Run the Migration
```bash
cd supabase
supabase migration up
```

This creates:
- `hero_wallets` table
- `wallet_transactions` table  
- `withdrawal_requests` table
- All indexes, RLS policies, and triggers

### Step 2: Verify Wallet Auto-Creation
```sql
-- Create a test hero profile
INSERT INTO hero_profiles (profile_id, skills, hourly_rate)
VALUES ('test-user-id', ARRAY['plumbing'], 50);

-- Check wallet was created
SELECT * FROM hero_wallets WHERE profile_id = 'test-user-id';
-- Should return 1 row with default balances
```

### Step 3: Add Query Functions to `services/supabase.ts`

```typescript
export const database = {
  // ... existing functions ...
  
  // Wallet queries
  getHeroWallet: async (profileId: string) => {
    const { data, error } = await supabase
      .from('hero_wallets')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    return { data, error };
  },

  getWalletTransactions: async (walletId: string) => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getWithdrawalRequests: async (walletId: string) => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('wallet_id', walletId)
      .order('requested_at', { ascending: false });
    return { data, error };
  },

  updateBankDetails: async (walletId: string, bankDetails: any) => {
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
    return { data, error };
  },

  createWithdrawalRequest: async (walletId: string, amount: number, bankDetails: any) => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        wallet_id: walletId,
        amount,
        bank_name: bankDetails.bank_name,
        bank_account_number: bankDetails.bank_account_number,
        bank_account_holder: bankDetails.bank_account_holder,
        status: 'pending'
      })
      .select()
      .single();
    return { data, error };
  },
};
```

### Step 4: Test Frontend Integration
```bash
# Start the app
npm start

# Navigate to hero earnings page
# Should see:
# - Wallet loads (default N$ 0.00 balances)
# - Empty transaction list
# - Withdraw button disabled (no balance)
```

---

## 🔧 Required Backend Functions (Phase 2)

### 1. Record Transaction Function
**File**: `supabase/migrations/20260113000001_wallet_functions.sql`

```sql
CREATE OR REPLACE FUNCTION record_wallet_transaction(
  p_wallet_id UUID,
  p_type transaction_type,
  p_amount DECIMAL(10,2),
  p_wallet_type TEXT,
  p_description TEXT,
  p_service_request_id UUID DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet hero_wallets;
  v_transaction wallet_transactions;
  v_new_earnings DECIMAL(10,2);
  v_new_fees DECIMAL(10,2);
BEGIN
  -- Get current wallet
  SELECT * INTO v_wallet FROM hero_wallets WHERE id = p_wallet_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Calculate new balances
  IF p_wallet_type = 'earnings' THEN
    v_new_earnings := v_wallet.earnings_balance + p_amount;
    v_new_fees := v_wallet.fee_balance;
    
    -- Earnings cannot go negative
    IF v_new_earnings < 0 THEN
      RAISE EXCEPTION 'Insufficient earnings balance';
    END IF;
  ELSE
    v_new_earnings := v_wallet.earnings_balance;
    v_new_fees := v_wallet.fee_balance + p_amount;
    -- Fees CAN go negative
  END IF;
  
  -- Update wallet
  UPDATE hero_wallets
  SET 
    earnings_balance = v_new_earnings,
    fee_balance = v_new_fees,
    updated_at = NOW()
  WHERE id = p_wallet_id;
  
  -- Create transaction record
  INSERT INTO wallet_transactions (
    wallet_id,
    type,
    amount,
    wallet_type,
    description,
    status,
    service_request_id,
    earnings_balance_after,
    fee_balance_after
  ) VALUES (
    p_wallet_id,
    p_type,
    p_amount,
    p_wallet_type,
    p_description,
    'completed',
    p_service_request_id,
    v_new_earnings,
    v_new_fees
  ) RETURNING * INTO v_transaction;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Process Withdrawal Function

```sql
CREATE OR REPLACE FUNCTION process_withdrawal_request(
  p_wallet_id UUID,
  p_amount DECIMAL(10,2)
)
RETURNS withdrawal_requests AS $$
DECLARE
  v_wallet hero_wallets;
  v_withdrawal withdrawal_requests;
  v_transaction wallet_transactions;
BEGIN
  -- Get wallet with lock
  SELECT * INTO v_wallet FROM hero_wallets WHERE id = p_wallet_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Validate
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  IF p_amount > v_wallet.earnings_balance THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  IF NOT v_wallet.identity_verified THEN
    RAISE EXCEPTION 'Identity verification required';
  END IF;
  
  IF v_wallet.bank_account_number IS NULL THEN
    RAISE EXCEPTION 'Bank account details required';
  END IF;
  
  -- Check cooldown
  IF v_wallet.last_withdrawal_at IS NOT NULL THEN
    IF NOW() < v_wallet.last_withdrawal_at + (v_wallet.withdrawal_cooldown_hours || ' hours')::INTERVAL THEN
      RAISE EXCEPTION 'Withdrawal cooldown active';
    END IF;
  END IF;
  
  -- Create transaction (deduct from earnings)
  SELECT * INTO v_transaction FROM record_wallet_transaction(
    p_wallet_id,
    'withdrawal',
    -p_amount,
    'earnings',
    'Withdrawal to bank account'
  );
  
  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    wallet_id,
    amount,
    status,
    bank_name,
    bank_account_number,
    bank_account_holder,
    transaction_id
  ) VALUES (
    p_wallet_id,
    p_amount,
    'pending',
    v_wallet.bank_name,
    v_wallet.bank_account_number,
    v_wallet.bank_account_holder,
    v_transaction.id
  ) RETURNING * INTO v_withdrawal;
  
  -- Update cooldown
  UPDATE hero_wallets
  SET last_withdrawal_at = NOW()
  WHERE id = p_wallet_id;
  
  RETURN v_withdrawal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Record Cash Job Fee

```sql
CREATE OR REPLACE FUNCTION record_cash_job_fee(
  p_profile_id UUID,
  p_service_request_id UUID,
  p_fee_amount DECIMAL(10,2)
)
RETURNS hero_wallets AS $$
DECLARE
  v_wallet hero_wallets;
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet FROM hero_wallets WHERE profile_id = p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Record fee (deduct from fee balance)
  PERFORM record_wallet_transaction(
    v_wallet.id,
    'cash_job_fee',
    -p_fee_amount,
    'fee',
    'Platform fee for cash job',
    p_service_request_id
  );
  
  -- Return updated wallet
  SELECT * INTO v_wallet FROM hero_wallets WHERE id = v_wallet.id;
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Record In-App Payment

```sql
CREATE OR REPLACE FUNCTION record_in_app_payment(
  p_profile_id UUID,
  p_service_request_id UUID,
  p_payment_amount DECIMAL(10,2)
)
RETURNS hero_wallets AS $$
DECLARE
  v_wallet hero_wallets;
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet FROM hero_wallets WHERE profile_id = p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Record payment (add to earnings)
  PERFORM record_wallet_transaction(
    v_wallet.id,
    'in_app_payment',
    p_payment_amount,
    'earnings',
    'Payment for completed job',
    p_service_request_id
  );
  
  -- Return updated wallet
  SELECT * INTO v_wallet FROM hero_wallets WHERE id = v_wallet.id;
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔗 Integration with Job Flow

### When Hero Accepts Cash Job
```typescript
// In job acceptance handler
const { data: wallet, error } = await supabase.rpc('record_cash_job_fee', {
  p_profile_id: heroProfileId,
  p_service_request_id: requestId,
  p_fee_amount: 10.00 // Platform fee
});

// Check if hero can still accept jobs
if (wallet.fee_balance < wallet.fee_threshold) {
  // Block further job acceptances
  // Show warning to hero
}
```

### When In-App Job Completes
```typescript
// In job completion handler
const { data: wallet, error } = await supabase.rpc('record_in_app_payment', {
  p_profile_id: heroProfileId,
  p_service_request_id: requestId,
  p_payment_amount: jobPayment // From service_request budget
});

// Hero's earnings balance is now updated
// Transaction is recorded in history
```

---

## ✅ Testing Checklist

### Basic Wallet Operations
```sql
-- 1. Create test wallet
INSERT INTO hero_wallets (profile_id) VALUES ('test-hero-1');

-- 2. Add earnings
SELECT record_wallet_transaction(
  (SELECT id FROM hero_wallets WHERE profile_id = 'test-hero-1'),
  'in_app_payment',
  100.00,
  'earnings',
  'Test payment'
);

-- 3. Check balance
SELECT earnings_balance FROM hero_wallets WHERE profile_id = 'test-hero-1';
-- Should be 100.00

-- 4. Try withdrawal
SELECT process_withdrawal_request(
  (SELECT id FROM hero_wallets WHERE profile_id = 'test-hero-1'),
  50.00
);
-- Should fail: identity not verified

-- 5. Verify identity
UPDATE hero_wallets 
SET identity_verified = TRUE, 
    bank_account_number = '1234567890',
    bank_account_holder = 'Test Hero'
WHERE profile_id = 'test-hero-1';

-- 6. Try withdrawal again
SELECT process_withdrawal_request(
  (SELECT id FROM hero_wallets WHERE profile_id = 'test-hero-1'),
  50.00
);
-- Should succeed

-- 7. Check balance
SELECT earnings_balance FROM hero_wallets WHERE profile_id = 'test-hero-1';
-- Should be 50.00

-- 8. Check transactions
SELECT * FROM wallet_transactions 
WHERE wallet_id = (SELECT id FROM hero_wallets WHERE profile_id = 'test-hero-1')
ORDER BY created_at DESC;
-- Should show 2 transactions
```

---

## 📞 Common Issues

### Issue: Wallet not auto-created
**Solution**: Check trigger exists
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_hero_profile_created';
```

### Issue: RLS blocking queries
**Solution**: Check policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'hero_wallets';
```

### Issue: Earnings going negative
**Solution**: Check constraint
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'hero_wallets'::regclass;
```

---

## 🎯 Success Criteria

- [ ] Migration runs without errors
- [ ] Wallets auto-create on hero profile creation
- [ ] RLS policies allow heroes to access own wallet
- [ ] Transactions record correctly
- [ ] Withdrawals validate properly
- [ ] Frontend loads wallet data
- [ ] Frontend displays transactions
- [ ] Withdrawal flow works end-to-end

---

## 📚 Full Documentation

For complete details, see:
- `docs/WALLET_BACKEND_REQUIREMENTS.md` - Full backend spec
- `docs/EARNINGS_REDESIGN_COMPLETE.md` - Implementation summary
- `supabase/migrations/20260113000000_create_wallet_system.sql` - Schema
- `app/(hero)/earnings-new.tsx` - Frontend implementation
- `stores/wallet.ts` - State management
