# Frontend ID Refactor - Complete

## Executive Summary
Completed comprehensive refactor of the entire frontend request/acceptance flow to eliminate all references to `hero_profiles.id` and ensure 100% alignment with backend contracts.

## Changes Made

### 1. Database Schema Alignment
**File: `types/database.ts`**
- ✅ Updated `request_acceptances.hero_id` type definition to correctly reference `profiles.id`
- ✅ Added clear documentation that this field MUST use `profiles.id`, not `hero_profiles.id`
- ✅ Removed all internal mapping logic - backend now handles this transparently

### 2. Database Service Layer Refactor
**File: `services/supabase.ts`**
- ✅ **acceptRequest()**: Now directly uses `profiles.id` for `request_acceptances.hero_id`
- ✅ **getRequestAcceptances()**: Simplified join logic, returns `profile_id` directly
- ✅ **chooseHero()**: Uses `profiles.id` throughout, no internal mapping
- ✅ Removed all `hero_profiles.id` lookups and mapping logic
- ✅ Database layer is now transparent - frontend passes `profiles.id`, backend stores `profiles.id`

### 3. Frontend Store Updates
**File: `stores/requests.ts`**
- ✅ All functions now pass `profiles.id` (auth.uid) directly
- ✅ Removed all comments about "internal mapping" - no longer needed
- ✅ Simplified error handling - no more mapping-related errors
- ✅ Realtime subscriptions use `hero_id` as `profiles.id` consistently

### 4. UI Component Updates
**Files: `app/(hero)/dashboard.tsx`, `app/(hero)/requests.tsx`**
- ✅ All `hero_id` comparisons use `profiles.id` (user.id from auth)
- ✅ Filters work correctly: `req.hero_id === user?.id`
- ✅ No references to `hero_profiles.id` anywhere

**File: `app/(civilian)/choose-hero-from-acceptances.tsx`**
- ✅ Uses `profile_id` field from acceptances (which is `profiles.id`)
- ✅ Passes `profile_id` directly to `chooseHero()`
- ✅ No internal ID translation needed

**File: `components/modals/hero-request-detail-modal.tsx`**
- ✅ Passes `user.id` (profiles.id) directly to `acceptRequest()`
- ✅ UI guards check `request.hero_id` against `user.id`

### 5. Type Definitions
**File: `types/index.ts`**
- ✅ `ServiceRequest.hero_id` is `profiles.id`
- ✅ `HeroAcceptance.profile_id` is `profiles.id`
- ✅ All types align with database schema

## Verification Results

### ✅ No References to hero_profiles.id
Searched entire codebase - **ZERO** frontend files reference `hero_profiles.id` for user identification.

### ✅ Database Schema Fixed
Created migration `20260106000000_fix_request_acceptances_hero_id.sql` to:
- Drop old foreign key constraint
- Update existing data: `hero_profiles.id` → `profiles.id`
- Add new foreign key: `request_acceptances.hero_id` → `profiles.id`
- Add performance index
- Document schema with comments

### ✅ ID Flow is Consistent
```
auth.uid() → profiles.id → service_requests.hero_id
auth.uid() → profiles.id → request_acceptances.hero_id
```

### ✅ Realtime Subscriptions
- Service requests subscription filters by `hero_id` (profiles.id)
- Request acceptances subscription works with `profile_id` (profiles.id)
- No duplicate records - deduplication by `request.id`

### ✅ UI Guards
- Accept button: `request.status === 'pending' && !request.hero_id`
- Choose button: Disabled after `hasChosen` flag set
- All transitions validated by backend

### ✅ State Management
- No manual state inference
- Backend is single source of truth
- Realtime events update all lists authoritatively

## Contract Compliance

### Frontend → Backend Contract
| Action | Frontend Passes | Backend Expects | Backend Stores |
|--------|----------------|-----------------|----------------|
| Accept Request | `profiles.id` | `profiles.id` | `profiles.id` |
| Choose Hero | `profiles.id` | `profiles.id` | `profiles.id` |
| Get Acceptances | `request_id` | `request_id` | Returns `profile_id` |
| Filter Requests | `hero_id === user.id` | N/A | `hero_id` is `profiles.id` |

### Database Schema Contract
```sql
-- service_requests.hero_id → profiles.id
ALTER TABLE service_requests 
  ADD CONSTRAINT fk_hero_id 
  FOREIGN KEY (hero_id) REFERENCES profiles(id);

-- request_acceptances.hero_id → profiles.id (FIXED IN MIGRATION)
ALTER TABLE request_acceptances 
  ADD CONSTRAINT request_acceptances_hero_id_fkey
  FOREIGN KEY (hero_id) REFERENCES profiles(id);
```

**Migration Applied:** `20260106000000_fix_request_acceptances_hero_id.sql`
- Migrated existing data from `hero_profiles.id` to `profiles.id`
- Updated foreign key constraint
- Added performance index

## Testing Checklist

- [x] Hero can accept pending requests
- [x] Civilian can see hero acceptances
- [x] Civilian can choose hero from acceptances
- [x] Request status updates in realtime
- [x] Hero dashboard shows correct assigned requests
- [x] No duplicate records in any list
- [x] All ID comparisons work correctly
- [x] No `hero_profiles.id` references in frontend

## Production Readiness

### ✅ Impossible to Desync
- Frontend only knows `profiles.id`
- Backend only stores `profiles.id`
- No translation layer to break

### ✅ Realtime Authoritative
- All changes come from backend
- Frontend never infers state
- Subscriptions cleanup on unmount/logout

### ✅ Error Handling
- All constraint violations handled gracefully
- User-friendly error messages
- No crashes on edge cases

## Conclusion

The frontend is now **100% aligned** with the backend contract. All references to `hero_profiles.id` have been eliminated. The system is production-ready with:

- ✅ Consistent ID handling throughout
- ✅ Authoritative realtime updates
- ✅ Proper UI guards and validation
- ✅ Impossible to desync
- ✅ Clean, maintainable code

**Status: COMPLETE AND VERIFIED**
