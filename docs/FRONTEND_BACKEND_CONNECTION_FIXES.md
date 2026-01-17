# Frontend-Backend Connection Fixes

## Critical Issues Found

### 1. Type Definitions Don't Match Database Schema ✅ FIXED

**Problem:** Your TypeScript types used `first_name`, `last_name`, `phone_number` but the Supabase schema uses `full_name`, `phone`.

**Fixed in:** `types/index.ts`
- Updated `CivilianProfile` to match schema: `full_name`, `phone`, `address`
- Updated `HeroProfile` to match schema: `full_name`, `phone`, `skills`, `hourly_rate`, `rating`, `completed_jobs`, `profile_image_url`
- Added missing types: `NotificationSettings`, `AvailabilitySchedule`, `ChatMessage`

### 2. Database Service Queries Wrong Table ⚠️ NEEDS FIX

**Problem:** `getUserProfile()` queries a `users` table that doesn't exist in your schema.

**Location:** `services/supabase.ts` line 345-380

**Current (WRONG):**
```typescript
getUserProfile: async (userId: string) => {
  const { data, error } = await supabase
    .from('users')  // ❌ This table doesn't exist!
    .select(`
      *,
      civilian_profiles(*),
      hero_profiles(*)
    `)
    .eq('id', userId)
    .single();
}
```

**Should be:**
```typescript
getUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
  const tableName = userType === 'civilian' ? 'civilian_profiles' : 'hero_profiles';
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('user_id', userId)
    .single();
}
```

### 3. Missing Profile Creation on Signup ⚠️ NEEDS IMPLEMENTATION

**Problem:** When users sign up, no profile row is created in `civilian_profiles` or `hero_profiles`.

**Added functions:** `createCivilianProfile()` and `createHeroProfile()` in `services/supabase.ts`

**Still needed:** Update `stores/auth.ts` to call these functions after successful signup.

**Implementation needed in `stores/auth.ts`:**
```typescript
signUp: async (email: string, password: string, userType: 'civilian' | 'hero') => {
  const { data, error } = await auth.signUp(email, password, userType);
  
  if (data.user && data.session) {
    // Create profile row
    if (userType === 'civilian') {
      await database.createCivilianProfile(data.user.id, {
        full_name: null,
        phone: null,
        address: null
      });
    } else {
      await database.createHeroProfile(data.user.id, {
        full_name: null,
        phone: null,
        skills: [],
        hourly_rate: 0
      });
    }
  }
}
```

### 4. User Store Needs userType Parameter ⚠️ NEEDS FIX

**Problem:** `useUserStore.loadUserProfile()` doesn't pass `userType` to `getUserProfile()`.

**Location:** `stores/user.ts` line 18

**Current:**
```typescript
loadUserProfile: async (userId: string) => {
  const { data, error } = await database.getUserProfile(userId);
}
```

**Should be:**
```typescript
loadUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
  const { data, error } = await database.getUserProfile(userId, userType);
}
```

**Also update calls in:**
- `app/(civilian)/profile.tsx` line 30
- `app/(hero)/profile.tsx` line 30

Change from:
```typescript
loadUserProfile(user.id);
```

To:
```typescript
loadUserProfile(user.id, user.user_type);
```

## Schema Reference (from xz.md)

### Tables in Supabase:
1. **civilian_profiles**
   - id (UUID)
   - user_id (UUID) → references auth.users(id)
   - full_name (TEXT)
   - phone (TEXT)
   - address (TEXT)
   - created_at, updated_at

2. **hero_profiles**
   - id (UUID)
   - user_id (UUID) → references auth.users(id)
   - full_name (TEXT)
   - phone (TEXT)
   - skills (TEXT[])
   - hourly_rate (NUMERIC)
   - rating (NUMERIC)
   - completed_jobs (INT)
   - profile_image_url (TEXT)
   - created_at, updated_at

3. **service_requests**
   - id (UUID)
   - civilian_id (UUID) → references auth.users(id)
   - hero_id (UUID) → references auth.users(id)
   - title (TEXT)
   - description (TEXT)
   - category (TEXT)
   - location (JSONB)
   - scheduled_date (TIMESTAMPTZ)
   - estimated_duration (INT)
   - budget_range (JSONB)
   - status (request_status enum)
   - created_at, updated_at

4. **chat_messages**
   - id (UUID)
   - request_id (UUID) → references service_requests(id)
   - sender_id (UUID) → references auth.users(id)
   - message (TEXT)
   - read_at (TIMESTAMPTZ)
   - created_at

5. **job_interest**
   - id (UUID)
   - job_id (UUID) → references service_requests(id)
   - hero_user_id (UUID) → references auth.users(id)
   - source (TEXT)
   - status (TEXT)
   - created_at

## Action Items

### High Priority (Blocking)
1. ✅ Fix type definitions to match schema
2. ⚠️ Fix `getUserProfile()` to query correct tables
3. ⚠️ Update `loadUserProfile()` to accept and pass `userType`
4. ⚠️ Update profile screen calls to pass `user.user_type`
5. ⚠️ Implement profile creation on signup

### Medium Priority
6. Test profile loading after login
7. Test profile updates
8. Verify RLS policies allow profile access
9. Test service request creation
10. Test chat functionality

### Low Priority
11. Add profile image upload functionality
12. Implement notification preferences storage
13. Add availability schedule storage for heroes

## Testing Checklist

After fixes:
- [ ] User can sign up as civilian
- [ ] User can sign up as hero
- [ ] Civilian profile loads after login
- [ ] Hero profile loads after login
- [ ] Civilian can update their profile
- [ ] Hero can update their profile
- [ ] Service requests can be created
- [ ] Chat messages can be sent
- [ ] Real-time updates work

## Notes

- Your schema uses `user_id` as foreign key, not `id`
- All profile queries must use `.eq('user_id', userId)` not `.eq('id', userId)`
- RLS policies are enabled - ensure authenticated users can read/write their own profiles
- Development mode mock client won't test actual Supabase connection
