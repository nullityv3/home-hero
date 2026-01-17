# Signup Error Fix - Complete Summary

## Problem Identified

**Error:** "An unexpected error occurred. Please try again" during signup after user account creation succeeded.

**Root Cause:** 
1. Profile tables (`civilian_profiles`, `hero_profiles`) were using `id` as primary key (not `user_id`)
2. Frontend code was trying to manually create profiles after signup
3. RLS policies were blocking profile creation because the newly signed-up user didn't have INSERT permissions
4. Code was inconsistently referencing both `user_id` and `id` columns

## Solution Implemented

### 1. Database Schema Fix (Already Applied by You)
```sql
-- Set id as NOT NULL and add foreign key constraints
ALTER TABLE public.civilian_profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.civilian_profiles
  ADD CONSTRAINT civilian_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.hero_profiles ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.hero_profiles
  ADD CONSTRAINT hero_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### 2. Database Trigger (Migration File Created)
**File:** `supabase/migrations/20241208000000_fix_profile_creation.sql`

The trigger automatically creates the appropriate profile when a user signs up:
- Reads `user_type` from `raw_user_meta_data`
- Creates `civilian_profiles` record if user_type = 'civilian'
- Creates `hero_profiles` record if user_type = 'hero'
- Uses `SECURITY DEFINER` to bypass RLS restrictions

### 3. RLS Policies (Migration File Created)
Clean policies using `id` column (not `user_id`):
```sql
-- Civilian policies
CREATE POLICY civilian_select_self ON public.civilian_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY civilian_update_self ON public.civilian_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Hero policies  
CREATE POLICY hero_select_self ON public.hero_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY hero_update_self ON public.hero_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### 4. Frontend Code Updates

#### `stores/auth.ts`
- **Removed** manual profile creation logic after signup
- Profile is now automatically created by database trigger
- Simplified signup flow

#### `services/supabase.ts`
- **Changed** all `user_id` references to `id`
- Updated `createCivilianProfile()` to use `id` column
- Updated `createHeroProfile()` to use `id` column
- Updated `getUserProfile()` to query by `id`
- Updated `updateCivilianProfile()` to filter by `id`
- Updated `updateHeroProfile()` to filter by `id`

## How It Works Now

### Signup Flow
```
1. User fills signup form → email, password, userType
2. Frontend calls auth.signUp(email, password, userType)
3. Supabase creates auth.users record with user_metadata.user_type
4. Database trigger fires automatically
5. Trigger creates profile in civilian_profiles OR hero_profiles
6. User is logged in with session
7. Frontend sets user state
```

### Key Benefits
- ✅ No manual profile creation needed in frontend
- ✅ Profile creation happens atomically with user creation
- ✅ RLS policies work correctly (trigger uses SECURITY DEFINER)
- ✅ Consistent use of `id` column throughout codebase
- ✅ Foreign key constraints ensure data integrity
- ✅ Cascade delete removes profiles when user is deleted

## Testing

### Manual Test
1. Open your app
2. Go to signup screen
3. Fill in email, password, select user type
4. Click "Create Account"
5. Should succeed without errors

### Automated Test
Run the test script:
```bash
npx ts-node scripts/test-signup.ts
```

This will:
- Create a test user
- Verify profile was created by trigger
- Check RLS policies work
- Clean up test data

## Files Modified

### Created
- `supabase/migrations/20241208000000_fix_profile_creation.sql` - Database migration
- `scripts/test-signup.ts` - Automated test script
- `docs/SIGNUP_FIX_SUMMARY.md` - This document

### Modified
- `stores/auth.ts` - Removed manual profile creation
- `services/supabase.ts` - Changed all `user_id` to `id`

## Next Steps

1. **Apply the migration** (if not already done):
   ```bash
   supabase db push
   ```

2. **Test signup** in your app

3. **Verify** existing users can still login and access their profiles

4. **Monitor logs** for any RLS policy violations

## Troubleshooting

### If signup still fails:

1. **Check trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

2. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('civilian_profiles', 'hero_profiles');
   ```

3. **Test trigger manually:**
   ```sql
   -- This should create a profile automatically
   INSERT INTO auth.users (id, email, raw_user_meta_data)
   VALUES (gen_random_uuid(), 'test@example.com', '{"user_type": "civilian"}');
   ```

4. **Check logs** in Supabase Dashboard → Logs → Postgres Logs

## Schema Reference

### civilian_profiles
- `id` (uuid, PRIMARY KEY, FK to auth.users.id)
- `full_name` (text, nullable)
- `phone` (text, nullable)
- `address` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### hero_profiles
- `id` (uuid, PRIMARY KEY, FK to auth.users.id)
- `full_name` (text, nullable)
- `phone` (text, nullable)
- `skills` (text[], nullable)
- `hourly_rate` (numeric, nullable)
- `rating` (numeric, nullable)
- `completed_jobs` (integer, nullable)
- `profile_image_url` (text, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)
