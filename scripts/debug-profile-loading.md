# Debug Profile Loading Issue

## Problem
After login, the app shows "Loading profile..." but never progresses.

## Debugging Steps

### 1. Check Console Logs
Look for these log messages in your console:

```
✅ Expected logs:
- "loadProfile called" with guard conditions
- "Starting profile load" with userId and userType
- "Profile loaded successfully"

❌ Problem indicators:
- "loadProfile skipped due to guards" - check the reason
- "Profile loading failed" - check the error
- "Profile loading timeout" - profile took >10 seconds
```

### 2. Check User State
Add this to your console after login:

```javascript
// In browser console or React Native debugger
console.log('Auth State:', {
  isAuthenticated: useAuthStore.getState().isAuthenticated,
  user: useAuthStore.getState().user,
  isProfileLoaded: useUserStore.getState().isProfileLoaded,
  isOnboarded: useUserStore.getState().isOnboarded
});
```

### 3. Common Issues

#### Issue: "loadProfile skipped - already attempted"
**Cause:** Profile load was attempted but failed silently
**Fix:** Click the "Retry" button or refresh the app

#### Issue: "loadProfile skipped - not authenticated"
**Cause:** Auth state not properly set after login
**Fix:** Check auth.ts signIn function sets user state correctly

#### Issue: "loadProfile skipped - no user type"
**Cause:** user_metadata.user_type is missing
**Fix:** Check signup flow sets user_type in metadata

#### Issue: Profile loading timeout
**Cause:** Supabase query is hanging or failing
**Fix:** 
1. Check Supabase connection
2. Check RLS policies allow user to read their profile
3. Check network connectivity

### 4. Manual Profile Load Test

Run this in your console to manually trigger profile load:

```javascript
const { useUserStore } = require('@/stores/user');
const { useAuthStore } = require('@/stores/auth');

const user = useAuthStore.getState().user;
if (user) {
  useUserStore.getState().loadUserProfile(user.id, user.user_type);
}
```

### 5. Check Supabase RLS Policies

Verify these policies exist:

```sql
-- Check if user can read their own profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Check if user can read their role profile
SELECT * FROM civilian_profiles WHERE profile_id = auth.uid();
-- OR
SELECT * FROM hero_profiles WHERE profile_id = auth.uid();
```

### 6. Network Tab Check

In browser dev tools Network tab, look for:
- POST to `/rest/v1/profiles` - should return 200
- POST to `/rest/v1/civilian_profiles` or `/hero_profiles` - should return 200 or 404

### 7. Force Profile Creation

If profile doesn't exist, create it manually:

```sql
-- In Supabase SQL Editor
INSERT INTO profiles (id, role, created_at, updated_at)
VALUES (
  'YOUR_USER_ID_HERE',
  'civilian', -- or 'hero'
  NOW(),
  NOW()
);

-- Then create role profile
INSERT INTO civilian_profiles (profile_id, created_at, updated_at)
VALUES (
  'YOUR_USER_ID_HERE',
  NOW(),
  NOW()
);
```

## Quick Fix

If stuck, try this sequence:
1. Sign out
2. Clear app cache/storage
3. Sign in again
4. If still stuck, click "Retry" button
5. If still stuck, check console logs for specific error

## Expected Flow

```
Login → Auth State Set → ProtectedRoute Mounts → 
loadProfile Called → Supabase Query → Profile State Updated → 
Layout Checks isOnboarded → Redirect or Show App
```

## Still Stuck?

Check these files for errors:
- `stores/user.ts` - loadUserProfile function
- `services/supabase.ts` - database.getProfile and database.getUserProfile
- `components/auth/protected-route.tsx` - loadProfile function
- Browser/RN console for error messages
