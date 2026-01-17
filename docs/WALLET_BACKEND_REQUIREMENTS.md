# Wallet System Backend Requirements

## 🎯 Overview
This document specifies the backend requirements for the dual-balance wallet system used in the HomeHeroes app. The frontend is fully implemented and requires these backend endpoints and database operations.

---

## 📊 Database Schema

### Tables Required

#### 1. `hero_wallets`
**Purpose**: Store wallet balances and settings for each hero

**Columns**:
- `id` (UUID, PRIMARY KEY)
- `profile_id` (UUID, FOREIGN KEY → profiles.id, UNIQUE)
- `earnings_balance` (DECIMAL(10,2), NOT NULL, DEFAULT 0.00, CHECK >= 0)
- `fee_balance` (DECIMAL(10,2), NOT NULL, DEFAULT 0.00)
- `fee_threshold` (DECIMAL(10,2), NOT NULL, DEFAULT -100.00)
- `bank_name` (TEXT, DEFAULT 'Bank Windhoek')
- `bank_account_number` (TEXT, NULLABLE)
- `bank_account_holder` (TEXT, NULLABLE)
- `identity_verified` (BOOLEAN, NOT NULL, DEFAULT FALSE)
- `identity_verified_at` (TIMESTAMPTZ, NULLABLE)
- `last_withdrawal_at` (TIMESTAMPTZ, NULLABLE)
- `withdrawal_cooldown_hours` (INTEGER, NOT NULL, DEFAULT 24)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_hero_wallets_profile_id` ON `profile_id`

**RLS Policies**:
- Heroes can SELECT their own wallet (profile_id = auth.uid())
- Heroes can UPDATE their own wallet bank details only

---

#### 2. `wallet_transactions`
**Purpose**: Ledger of all wallet transactions

**Columns**:
- `id` (UUID, PRIMARY KEY)
- `wallet_id` (UUID, FOREIGN KEY → hero_wallets.id)
- `type` (ENUM: 'cash_job_fee', 'in_app_payment', 'withdrawal', 'fee_top_up', 'refund', 'adjustment')
- `amount` (DECIMAL(10,2), NOT NULL)
- `wallet_type` (TEXT, CHECK IN ('earnings', 'fee'))
- `description` (TEXT, NOT NULL)
- `status` (ENUM: 'pending', 'completed', 'failed', 'cancelled')
- `service_request_id` (UUID, FOREIGN KEY → service_requests.id, NULLABLE)
- `earnings_balance_after` (DECIMAL(10,2), NULLABLE)
- `fee_balance_after` (DECIMAL(10,2), NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_wallet_transactions_wallet_id` ON `wallet_id`
- `idx_wallet_transactions_created_at` ON `created_at DESC`
- `idx_wallet_transactions_type` ON `type`

**RLS Policies**:
- Heroes can SELECT transactions for their own wallet

---

#### 3. `withdrawal_requests`
**Purpose**: Track withdrawal requests and their processing status

**Columns**:
- `id` (UUID, PRIMARY KEY)
- `wallet_id` (UUID, FOREIGN KEY → hero_wallets.id)
- `amount` (DECIMAL(10,2), NOT NULL, CHECK > 0)
- `status` (ENUM: 'pending', 'completed', 'failed', 'cancelled')
- `bank_name` (TEXT, NOT NULL)
- `bank_account_number` (TEXT, NOT NULL)
- `bank_account_holder` (TEXT, NOT NULL)
- `requested_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `processed_at` (TIMESTAMPTZ, NULLABLE)
- `completed_at` (TIMESTAMPTZ, NULLABLE)
- `failed_at` (TIMESTAMPTZ, NULLABLE)
- `failure_reason` (TEXT, NULLABLE)
- `transaction_id` (UUID, FOREIGN KEY → wallet_transactions.id, NULLABLE)
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())

**Indexes**:
- `idx_withdrawal_requests_wallet_id` ON `wallet_id`
- `idx_withdrawal_requests_status` ON `status`

**RLS Policies**:
- Heroes can SELECT their own withdrawal requests
- Heroes can INSERT withdrawal requests for their own wallet

---

## 🔧 Backend Functions Needed

### 1. Automatic Wallet Creation
**Trigger**: When a hero_profile is created
**Action**: Automatically create a hero_wallet with default values

```sql
CREATE TRIGGER on_hero_profile_created
  AFTER INSERT ON hero_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_hero_wallet();
```

---

### 2. Transaction Recording Function
**Function**: `record_wallet_transaction()`
**Purpose**: Atomically update wallet balance and create transaction record

**Inputs**:
- `p_wallet_id` (UUID)
- `p_type` (transaction_type)
- `p_amount` (DECIMAL)
- `p_wallet_type` ('earnings' | 'fee')
- `p_description` (TEXT)
- `p_service_request_id` (UUID, OPTIONAL)

**Logic**:
1. Validate wallet exists
2. Check balance constraints (earnings cannot go negative)
3. Update wallet balance
4. Insert transaction record with balance snapshots
5. Return transaction record

**Returns**: Transaction record or error

---

### 3. Withdrawal Processing Function
**Function**: `process_withdrawal_request()`
**Purpose**: Handle withdrawal request creation and validation

**Inputs**:
- `p_wallet_id` (UUID)
- `p_amount` (DECIMAL)

**Validation**:
1. Check earnings_balance >= amount
2. Check identity_verified = TRUE
3. Check bank details exist
4. Check withdrawal cooldown (last_withdrawal_at + cooldown_hours)
5. Validate amount > 0

**Logic**:
1. Create withdrawal_request record
2. Create pending transaction record
3. Deduct from earnings_balance (optimistic)
4. Update last_withdrawal_at
5. Return withdrawal request

**Returns**: Withdrawal request record or error

---

### 4. Cash Job Fee Recording
**Function**: `record_cash_job_fee()`
**Purpose**: Record fee when hero accepts cash job

**Inputs**:
- `p_profile_id` (UUID)
- `p_service_request_id` (UUID)
- `p_fee_amount` (DECIMAL)

**Logic**:
1. Get hero's wallet
2. Deduct from fee_balance (can go negative)
3. Create transaction record
4. Check if fee_balance < fee_threshold
5. Return updated wallet state

**Returns**: Wallet record with job_acceptance_allowed flag

---

### 5. In-App Payment Recording
**Function**: `record_in_app_payment()`
**Purpose**: Credit earnings when in-app job is completed

**Inputs**:
- `p_profile_id` (UUID)
- `p_service_request_id` (UUID)
- `p_payment_amount` (DECIMAL)

**Logic**:
1. Get hero's wallet
2. Add to earnings_balance
3. Create transaction record
4. Return updated wallet

**Returns**: Wallet record

---

## 🔌 Frontend Integration Points

### Store Functions (stores/wallet.ts)

#### `loadWallet(profileId: string)`
**Backend Query**:
```typescript
supabase
  .from('hero_wallets')
  .select('*')
  .eq('profile_id', profileId)
  .maybeSingle()
```

---

#### `loadTransactions(walletId: string, filters?: TransactionFilters)`
**Backend Query**:
```typescript
let query = supabase
  .from('wallet_transactions')
  .select('*')
  .eq('wallet_id', walletId)
  .order('created_at', { ascending: false });

// Apply filters
if (filters?.type === 'earnings') {
  query = query.eq('wallet_type', 'earnings');
} else if (filters?.type === 'fees') {
  query = query.eq('wallet_type', 'fee');
} else if (filters?.type === 'payouts') {
  query = query.eq('type', 'withdrawal');
}

if (filters?.startDate) {
  query = query.gte('created_at', filters.startDate);
}

if (filters?.endDate) {
  query = query.lte('created_at', filters.endDate);
}
```

---

#### `loadWithdrawalRequests(walletId: string)`
**Backend Query**:
```typescript
supabase
  .from('withdrawal_requests')
  .select('*')
  .eq('wallet_id', walletId)
  .order('requested_at', { ascending: false })
```

---

#### `updateBankDetails(walletId: string, bankDetails: BankDetails)`
**Backend Query**:
```typescript
supabase
  .from('hero_wallets')
  .update({
    bank_name: bankDetails.bank_name,
    bank_account_number: bankDetails.bank_account_number,
    bank_account_holder: bankDetails.bank_account_holder,
    updated_at: new Date().toISOString()
  })
  .eq('id', walletId)
  .select()
  .single()
```

---

#### `requestWithdrawal(walletId: string, amount: number)`
**Backend Query**:
```typescript
// Call the process_withdrawal_request() function
supabase.rpc('process_withdrawal_request', {
  p_wallet_id: walletId,
  p_amount: amount
})
```

**Alternative (if no RPC)**:
```typescript
// 1. Validate
const { data: wallet } = await supabase
  .from('hero_wallets')
  .select('*')
  .eq('id', walletId)
  .single();

// 2. Create withdrawal request
const { data, error } = await supabase
  .from('withdrawal_requests')
  .insert({
    wallet_id: walletId,
    amount,
    bank_name: wallet.bank_name,
    bank_account_number: wallet.bank_account_number,
    bank_account_holder: wallet.bank_account_holder,
    status: 'pending'
  })
  .select()
  .single();
```

---

## ✅ Validation Rules

### Withdrawal Eligibility
```typescript
canWithdraw() {
  // Check 1: Balance
  if (wallet.earnings_balance <= 0) {
    return { allowed: false, reason: 'No funds available' };
  }
  
  // Check 2: Identity verification
  if (!wallet.identity_verified) {
    return { allowed: false, reason: 'Identity verification required' };
  }
  
  // Check 3: Bank details
  if (!wallet.bank_account_number || !wallet.bank_account_holder) {
    return { allowed: false, reason: 'Bank account details required' };
  }
  
  // Check 4: Cooldown
  if (wallet.last_withdrawal_at) {
    const cooldownEnd = new Date(
      new Date(wallet.last_withdrawal_at).getTime() + 
      wallet.withdrawal_cooldown_hours * 60 * 60 * 1000
    );
    
    if (new Date() < cooldownEnd) {
      const hoursRemaining = Math.ceil(
        (cooldownEnd.getTime() - Date.now()) / (60 * 60 * 1000)
      );
      return { 
        allowed: false, 
        reason: `Cooldown active. Try again in ${hoursRemaining} hours` 
      };
    }
  }
  
  return { allowed: true };
}
```

### Job Acceptance Eligibility
```typescript
canAcceptJobs() {
  return wallet.fee_balance >= wallet.fee_threshold;
}
```

---

## 🔐 Security Requirements

### Row Level Security (RLS)
1. **hero_wallets**: Heroes can only access their own wallet
2. **wallet_transactions**: Heroes can only view their own transactions
3. **withdrawal_requests**: Heroes can only view/create their own requests

### Data Validation
1. **Earnings balance**: Cannot go negative
2. **Fee balance**: Can go negative but has threshold
3. **Withdrawal amount**: Must be > 0 and <= earnings_balance
4. **Bank details**: Required for withdrawals

### Audit Trail
- All transactions must record balance snapshots
- Withdrawal requests must capture bank details at time of request
- All updates must update `updated_at` timestamp

---

## 📱 Frontend States to Handle

### Loading States
- Wallet loading
- Transactions loading
- Withdrawal processing
- Bank details updating

### Empty States
- No wallet yet (new hero)
- No transactions
- No withdrawal requests

### Error States
- Wallet load failed
- Transaction load failed
- Withdrawal failed (with reason)
- Bank details update failed
- Network error

### Success States
- Withdrawal requested successfully
- Bank details updated
- Refresh completed

---

## 🚀 Implementation Priority

### Phase 1: Core Wallet (REQUIRED)
1. Create `hero_wallets` table
2. Create automatic wallet creation trigger
3. Implement `loadWallet()` query
4. Implement `updateBankDetails()` query

### Phase 2: Transactions (REQUIRED)
1. Create `wallet_transactions` table
2. Create `record_wallet_transaction()` function
3. Implement `loadTransactions()` query with filters
4. Implement transaction recording for completed jobs

### Phase 3: Withdrawals (REQUIRED)
1. Create `withdrawal_requests` table
2. Create `process_withdrawal_request()` function
3. Implement `requestWithdrawal()` flow
4. Implement `loadWithdrawalRequests()` query

### Phase 4: Cash Job Fees (REQUIRED)
1. Implement `record_cash_job_fee()` function
2. Integrate with job acceptance flow
3. Add fee balance checks to job eligibility

### Phase 5: Admin Processing (FUTURE)
1. Admin dashboard for withdrawal processing
2. Bank integration for automated payouts
3. Identity verification workflow
4. Fee reconciliation tools

---

## 📝 Testing Checklist

### Unit Tests
- [ ] Wallet creation on hero profile creation
- [ ] Transaction recording with balance updates
- [ ] Withdrawal validation logic
- [ ] Fee balance can go negative
- [ ] Earnings balance cannot go negative

### Integration Tests
- [ ] Complete withdrawal flow
- [ ] Transaction filtering
- [ ] Bank details update
- [ ] Cooldown enforcement
- [ ] RLS policies work correctly

### Edge Cases
- [ ] Withdrawal during cooldown
- [ ] Withdrawal without bank details
- [ ] Withdrawal without verification
- [ ] Negative fee balance below threshold
- [ ] Concurrent transaction handling

---

## 🎨 UI/UX Notes

### Visual Hierarchy
1. **Earnings Wallet** = Primary (green accent, prominent)
2. **Fee Wallet** = Secondary (orange/red accent, muted)
3. **Transactions** = Tertiary (neutral, informational)

### Color Coding
- **Earnings**: Green (#34C759)
- **Fees**: Orange (#FF9500) or Red (#FF3B30) if negative
- **Pending**: Orange (#FF9500)
- **Completed**: Green (#34C759)
- **Failed**: Red (#FF3B30)

### User Messaging
- Clear, human language (no jargon)
- Explain why actions are disabled
- Show next steps when blocked
- Never blame the user

---

## 📞 Support Scenarios

### Common Issues
1. **"Why can't I withdraw?"**
   - Show specific reason (verification, cooldown, balance, bank details)
   
2. **"Where did my money go?"**
   - Transaction history with clear descriptions
   
3. **"What are platform fees?"**
   - "How your money works" explanation section
   
4. **"When will I get my money?"**
   - "1-3 business days" clearly stated

---

## ✅ Definition of Done

Frontend is complete when:
- [x] All UI components implemented
- [x] All modals functional
- [x] All states handled (loading, error, empty, success)
- [x] Wallet store fully implemented
- [x] Transaction filtering works
- [x] Withdrawal flow complete
- [x] Bank details management works
- [x] Responsive design
- [x] Accessible (contrast, font sizes)

Backend is complete when:
- [ ] All tables created with RLS
- [ ] All functions implemented
- [ ] Wallet auto-creation works
- [ ] Transaction recording works
- [ ] Withdrawal processing works
- [ ] Fee recording works
- [ ] All queries return expected data
- [ ] All validations enforced
- [ ] Audit trail complete
- [ ] Tests passing

---

## 🔗 Related Files

### Frontend
- `app/(hero)/earnings-new.tsx` - Main earnings page
- `stores/wallet.ts` - Wallet state management
- `types/database.ts` - TypeScript types (needs wallet types added)

### Backend
- `supabase/migrations/20260113000000_create_wallet_system.sql` - Schema migration
- `services/supabase.ts` - Add wallet query functions

### Documentation
- This file - Backend requirements
- `docs/EARNINGS_PAGE_IMPROVEMENTS.md` - Original requirements
