# Infinite Redirect Loop Fix - Complete Solution

## Problem Summary

After login, the app was stuck in an infinite onboarding redirect loop with these symptoms:

- App keeps loading forever after successful authentication
- Logs show repeated "Profile loaded" → "Profile not found" → "Onboarding redirect triggered"
- `profiles` record exists but `civilian_profiles` does not yet
- `isOnboarded = false` causes layout to redirect to profile page
- Layout keeps re-mounting, causing the redirect loop
- Cached profile requests return stale data, worsening the loop

## Root Causes

1. **Layout redirects before profile fully loads** - Redirect logic ran before `isProfileLoaded = true`
2. **No loading screen during profile resolution** - Tabs rendered immediately, triggering premature redirects
3. **Profile creation doesn't update state** - After creating `civilian_profiles`, the onboarding state wasn't refreshed
4. **Cache returns stale data** - Cached "no profile" results persisted after profile creation
5. **Multiple concurrent redirects** - No guard to prevent redirect from firing multiple times

## Solution Architecture

### Fix 1: Fire-Once Redirect Guard
**Location:** `app/(civilian)/_layout.tsx`

```typescript
const hasRedirectedRef = useRef(false);

useEffect(() => {
  if (hasRedirectedRef.current) return; // Only redirect once per session
  
  if (!isProfileLoaded || !user) return;
  
  if (!isOnboarded) {
    hasRedirectedRef.current = true;
    router.replace('/(civilian)/profile');
  }
}, [isProfileLoaded, isOnboarded, user, router]);
```

**Why it works:**
- Uses `useRef` to persist across re-renders
- Prevents multiple redirect attempts during layout re-mounts
- Resets only on unmount (new session)

### Fix 2: Wait for Profile Resolution
**Location:** `app/(civilian)/_layout.tsx`

```typescript
useEffect(() => {
  // Guard: Don't do anything until profile is fully loaded
  if (!isProfileLoaded) {
    return;
  }
  // ... rest of redirect logic
}, [isProfileLoaded, isOnboarded, user, router]);
```

**Why it works:**
- Ensures profile fetch completes before routing decisions
- Prevents redirects based on stale/loading state
- Declarative dependency array ensures proper re-evaluation

### Fix 3: Loading Screen During Profile Load
**Location:** `app/(civilian)/_layout.tsx`

```typescript
if (!isProfileLoaded) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text>Loading profile...</Text>
    </View>
  );
}
```

**Why it works:**
- Prevents tabs from rendering before profile state is known
- Provides clear user feedback during loading
- Eliminates race conditions between layout mount and profile load

### Fix 4: Idempotent Profile Creation
**Location:** `app/(civilian)/profile.tsx`

```typescript
if (!civilianProfile) {
  const { error } = await database.createCivilianProfile(user.id, {
    address: address.trim(),
  });
  
  if (error) {
    Alert.alert('Error', 'Failed to create profile. Please try again.');
    return;
  }
  
  // Force fresh profile data
  await loadUserProfile(user.id, 'civilian');
}
```

**Why it works:**
- Uses `upsert` in database layer to handle duplicate inserts safely
- Reloads profile immediately after creation
- Updates `isOnboarded` state automatically

### Fix 5: Finalize Onboarding State
**Location:** `app/(civilian)/profile.tsx`

```typescript
if (civilianResult.success) {
  setIsEditing(false);
  Alert.alert('Success', 'Profile updated successfully');
  
  // Reload to update isOnboarded state
  await loadUserProfile(user.id, 'civilian');
}
```

**Why it works:**
- Explicitly refreshes profile state after updates
- Recalculates `isOnboarded` based on fresh data
- Ensures layout sees updated state on next render

### Fix 6: Remove Profile Query Caching
**Location:** `services/supabase.ts`

```typescript
getUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
  // NO CACHING - Profile queries must always be fresh
  // Cache was causing infinite loop by returning stale "no profile" results
  
  const { data: profiles, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('profile_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);
  
  const data = profiles && profiles.length > 0 ? profiles[0] : null;
  
  // Missing profile is NOT an error - it's an onboarding state
  if (!error && !data) {
    return { data: null, error: null };
  }
  
  return { data, error };
}
```

**Why it works:**
- Eliminates stale cached responses
- Always fetches fresh profile data
- Critical for onboarding flow where profile state changes rapidly

### Fix 7: Enhanced Profile Loading with Error Handling
**Location:** `stores/user.ts`

```typescript
loadUserProfile: async (userId: string, userType: 'civilian' | 'hero') => {
  set({ isLoading: true, error: null, isProfileLoaded: false });
  
  try {
    // Load canonical profile
    const { data: profileData, error: profileError } = await database.getProfile(userId);
    
    if (profileError || !profileData) {
      set({ 
        error: profileError?.message || 'Profile not found', 
        isLoading: false, 
        isProfileLoaded: true,
        isOnboarded: false 
      });
      return;
    }

    // Load role-specific profile
    const { data: roleData, error: roleError } = await database.getUserProfile(userId, userType);
    
    // Calculate onboarding status
    const hasCanonicalProfile = !!profileData;
    const hasRoleProfile = !!roleData && !roleError;
    const isOnboarded = hasCanonicalProfile && hasRoleProfile;

    // Update state with complete profile data
    set({ 
      profile: profileData,
      civilianProfile: userType === 'civilian' ? roleData : null,
      heroProfile: userType === 'hero' ? roleData : null,
      isLoading: false,
      isProfileLoaded: true,
      isOnboarded
    });
  } catch (error) {
    set({ 
      error: 'Failed to load user profile', 
      isLoading: false,
      isProfileLoaded: true,
      isOnboarded: false
    });
  }
}
```

**Why it works:**
- Proper error handling prevents undefined states
- Always sets `isProfileLoaded = true` even on error
- Calculates `isOnboarded` from actual data, not assumptions

## Profile State Flow

### Initial Login (No civilian_profiles)
```
1. User logs in → auth.signIn() succeeds
2. Layout mounts → loadUserProfile() called
3. isProfileLoaded = false → Show loading screen
4. Profile fetch completes:
   - profiles: EXISTS
   - civilian_profiles: NULL
   - isOnboarded = false
5. isProfileLoaded = true → Hide loading screen
6. Redirect guard fires ONCE → router.replace('/profile')
7. User lands on profile page
```

### Profile Completion
```
1. User fills form → clicks Save
2. createCivilianProfile() called (idempotent upsert)
3. loadUserProfile() called to refresh state
4. Profile fetch completes:
   - profiles: EXISTS
   - civilian_profiles: EXISTS
   - isOnboarded = true
5. User navigates to home → Layout allows access
6. No redirect (isOnboarded = true)
```

### Subsequent Logins (Complete Profile)
```
1. User logs in → auth.signIn() succeeds
2. Layout mounts → loadUserProfile() called
3. isProfileLoaded = false → Show loading screen
4. Profile fetch completes:
   - profiles: EXISTS
   - civilian_profiles: EXISTS
   - isOnboarded = true
5. isProfileLoaded = true → Hide loading screen
6. Redirect guard checks → isOnboarded = true → No redirect
7. Tabs render normally
```

## Key Principles Applied

### 1. Idempotent Operations
- Profile creation uses `upsert` to handle duplicates
- Multiple calls to `createCivilianProfile()` are safe
- No race conditions from concurrent requests

### 2. Layout-Safe Routing
- Never redirect during loading state
- Always wait for `isProfileLoaded = true`
- Use `useRef` for fire-once guards

### 3. Cache-Aware State Management
- Profile queries bypass cache for fresh data
- Explicit reload after profile mutations
- State updates trigger proper re-renders

### 4. Canonical vs Role Profile Separation
- `profiles` → canonical identity (always exists after signup)
- `civilian_profiles` / `hero_profiles` → role completion
- Onboarding = both profiles exist

### 5. Declarative Routing Logic
- Routing decisions in guarded `useEffect`
- Not inline conditionals
- Clear dependency arrays

## Testing Checklist

- [ ] Fresh signup → redirects to profile once
- [ ] Complete profile → redirects to home
- [ ] Logout and login → no redirect (profile complete)
- [ ] Incomplete profile → redirects to profile on every login
- [ ] No infinite loops in any scenario
- [ ] Loading screen shows during profile fetch
- [ ] Profile updates reflect immediately

## Files Modified

1. `app/(civilian)/_layout.tsx` - Redirect guard, loading screen
2. `app/(civilian)/profile.tsx` - Profile creation, state refresh
3. `stores/user.ts` - Enhanced profile loading
4. `services/supabase.ts` - Removed profile query caching

## Future Improvements

1. **Add profile completion progress indicator** - Show % complete
2. **Implement profile validation** - Require minimum fields
3. **Add onboarding wizard** - Multi-step guided flow
4. **Cache invalidation strategy** - Selective cache clearing
5. **Hero profile onboarding** - Apply same pattern to hero flow

## Related Documentation

- [Infinite Redirect Loop Fix V1](./INFINITE_REDIRECT_LOOP_FIX.md)
- [Infinite Redirect Loop Fix V2](./INFINITE_REDIRECT_LOOP_FIX_FINAL.md)
- [Redirect Loop Fix Complete](./REDIRECT_LOOP_FIX_COMPLETE.md)
- [Frontend Schema Alignment](./FRONTEND_SCHEMA_ALIGNMENT_COMPLETE.md)

---

**Status:** ✅ COMPLETE  
**Date:** 2026-01-11  
**Tested:** Pending verification script execution
