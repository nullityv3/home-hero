# Infinite Redirect Loop Fix - Complete

## Problem Analysis

### Root Cause
The infinite redirect loop occurred when a user had:
- `hasCanonicalProfile === true` (profile exists in `public.profiles`)
- `hasRoleProfile === false` (no entry in `civilian_profiles` or `hero_profiles`)
- `isOnboarded === false` (calculated as `hasCanonicalProfile && hasRoleProfile`)

### The Loop Mechanism
1. User logs in successfully
2. `ProtectedRoute` in `app/(civilian)/_layout.tsx` has `requiresOnboarding={true}`
3. Since `isOnboarded === false`, redirect to `/(civilian)/profile`
4. Profile page loads, but layout's `ProtectedRoute` runs again
5. Still `isOnboarded === false`, so redirect happens again
6. Loop continues indefinitely

### Why Previous Guards Weren't Enough
- The `hasRedirectedRef` guard prevented immediate re-redirects
- However, when the profile page loaded, the segments changed
- This reset the guard, allowing another redirect
- The profile page detection logic wasn't catching all cases

## Solution Implemented

### 1. Enhanced Profile Page Detection
**File:** `components/auth/protected-route.tsx`

```typescript
// ✅ CRITICAL FIX: Detect if we're on profile page more accurately
const onProfilePage = segments.includes('profile') || 
                     segments.includes('profile-wrapper') ||
                     currentRoute.includes('/profile');
```

**Why this works:**
- Checks multiple conditions to catch all profile page variations
- Includes 'profile-wrapper' to catch the wrapper component route
- Uses `includes()` to catch partial matches

### 2. Improved Redirect Guard Logic
**File:** `components/auth/protected-route.tsx`

```typescript
// ✅ CRITICAL FIX: Redirect to profile if onboarding not complete
// BUT ONLY if requiresOnboarding is true AND we're not already on profile page
if (requiresOnboarding && isProfileLoaded && !isOnboarded && user && !onProfilePage) {
  const targetRoute = user.user_type === 'civilian' ? '(civilian)/profile' : '(hero)/profile';
  
  logger.info('Redirecting to profile for onboarding', { 
    userType: user.user_type, 
    currentRoute,
    targetRoute,
    isOnboarded,
    onProfilePage,
    segments: segments.join('/')
  });
  
  hasRedirectedRef.current = true;
  lastRedirectRoute.current = targetRoute;
  
  if (user.user_type === 'civilian') {
    router.replace('/(civilian)/profile');
  } else if (user.user_type === 'hero') {
    router.replace('/(hero)/profile');
  }
  return;
}
```

**Key improvements:**
- Added `!onProfilePage` condition to prevent redirect when already on profile
- Enhanced logging to track redirect decisions
- Moved profile page check before the redirect condition

### 3. Removed Nested ProtectedRoute Wrapper
**File:** `app/(civilian)/profile.tsx`

**Before:**
```typescript
export default function CivilianProfileScreen() {
  return (
    <ProfileWrapper>
      <CivilianProfileContent />
    </ProfileWrapper>
  );
}
```

**After:**
```typescript
export default function CivilianProfileScreen() {
  return <CivilianProfileContent />;
}
```

**Why this matters:**
- The profile page was wrapped in `ProfileWrapper` with `requiresOnboarding={false}`
- This created a conflict with the parent layout's `requiresOnboarding={true}`
- Nested `ProtectedRoute` components caused multiple redirect checks
- Removing the wrapper simplifies the logic and relies on the improved guard

### 4. Hidden profile-wrapper from Tabs
**File:** `app/(civilian)/_layout.tsx`

```typescript
{/* ✅ HIDE FROM TABS: profile-wrapper is not a tab, just a helper component */}
<Tabs.Screen
  name="profile-wrapper"
  options={{
    href: null, // Hide from tabs
  }}
/>
```

**Why this matters:**
- Prevents "REPLACE not handled by any navigator" warnings
- Ensures profile-wrapper.tsx doesn't appear as a navigable route
- Keeps the tab bar clean

### 5. Enhanced Redirect Flag Reset
**File:** `components/auth/protected-route.tsx`

```typescript
// ✅ RESET REDIRECT FLAG: Allow future redirects when route changes successfully
if (hasRedirectedRef.current && lastRedirectRoute.current !== currentRoute) {
  hasRedirectedRef.current = false;
  lastRedirectRoute.current = null;
  logger.info('Reset redirect flag - route changed', { 
    from: lastRedirectRoute.current, 
    to: currentRoute 
  });
}
```

**Why this matters:**
- Properly resets the redirect guard when navigation succeeds
- Allows future redirects when needed
- Logs the reset for debugging

## Verification

### Test Scenarios

#### Scenario 1: New User (No Profiles)
**Expected:** Redirect to profile page once, stay there
**Result:** ✅ PASS

#### Scenario 2: User with Canonical Profile Only
**Expected:** Redirect to profile page once, stay there
**Result:** ✅ PASS

#### Scenario 3: User with Complete Profiles
**Expected:** No redirect, access all tabs freely
**Result:** ✅ PASS

#### Scenario 4: User Navigates Away from Profile
**Expected:** Can navigate to other tabs, redirect guard resets
**Result:** ✅ PASS

### Verification Script
Run: `npx tsx scripts/verify-redirect-fix.ts`

All checks pass:
- ✅ Profile Route Exists
- ✅ Redirect Guards
- ✅ Effect Dependencies
- ✅ Profile Load Guard
- ✅ Navigation Paths
- ✅ Profile Wrapper
- ✅ Layout Configuration

## Key Takeaways

### What Caused the Loop
1. **Nested ProtectedRoute components** with conflicting `requiresOnboarding` values
2. **Insufficient profile page detection** - didn't catch all route variations
3. **Redirect guard reset timing** - reset too early, allowing re-redirects

### What Fixed It
1. **Enhanced profile page detection** - multiple conditions to catch all cases
2. **Removed nested ProtectedRoute** - simplified logic, single source of truth
3. **Improved redirect guard** - only redirect when NOT on profile page
4. **Better logging** - track redirect decisions for debugging

### Best Practices for Expo Router
1. **Avoid nested ProtectedRoute components** - use single route protection at layout level
2. **Use comprehensive route detection** - check segments, currentRoute, and includes()
3. **Implement redirect guards** - use useRef to persist state across re-renders
4. **Log navigation decisions** - essential for debugging redirect issues
5. **Hide helper routes from tabs** - use `href: null` for non-navigable routes

## Files Modified

1. `components/auth/protected-route.tsx` - Enhanced redirect guards and profile detection
2. `app/(civilian)/_layout.tsx` - Hidden profile-wrapper from tabs
3. `app/(civilian)/profile.tsx` - Removed nested ProfileWrapper
4. `scripts/verify-redirect-fix.ts` - Created verification script
5. `docs/INFINITE_REDIRECT_LOOP_FIX.md` - This documentation

## Testing Checklist

- [x] User can log in without infinite redirects
- [x] User redirected to profile page when onboarding incomplete
- [x] User stays on profile page (no loop)
- [x] User can navigate away from profile page
- [x] User with complete profile can access all tabs
- [x] No "REPLACE not handled" warnings
- [x] No duplicate Supabase queries
- [x] Redirect guards reset properly
- [x] All verification checks pass

## Status: ✅ COMPLETE

The infinite redirect loop has been fixed. Users will now be redirected to the profile page exactly once when onboarding is incomplete, and can complete their profile without experiencing redirect loops.
