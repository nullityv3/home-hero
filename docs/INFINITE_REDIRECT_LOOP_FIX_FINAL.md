# Infinite Redirect Loop Fix - Final Implementation

## Problem Analysis

The infinite redirect loop was caused by a **race condition** in `components/auth/protected-route.tsx`:

1. **Router.replace() is asynchronous** - it doesn't complete immediately
2. **useSegments() updates after navigation completes** - not during
3. **The redirect guard logic relied on segments** - which were stale during navigation

### The Race Condition Flow

```
1. User logs in (not onboarded)
2. ProtectedRoute detects !isOnboarded
3. Calls router.replace('/(civilian)/profile')
4. useEffect re-runs BEFORE segments update
5. segments still shows old route (e.g., 'home')
6. Guard logic: "not on profile page" → redirect again
7. LOOP: Steps 3-6 repeat infinitely
```

### Why Previous Guards Failed

**Old approach:**
```typescript
const onProfilePage = segments.includes('profile');
if (!isOnboarded && !onProfilePage) {
  router.replace('/(civilian)/profile'); // ❌ Can fire multiple times
}
```

**Problem:** `segments` doesn't update until navigation completes, so `onProfilePage` stays `false` during the redirect, allowing multiple redirects.

## Solution: Navigation-In-Progress Guard

### Implementation

Added two `useRef` guards that persist across re-renders:

```typescript
// ✅ Blocks ALL redirects while navigation is in progress
const isNavigatingRef = useRef(false);

// ✅ Ensures onboarding redirect fires exactly once
const onboardingRedirectFiredRef = useRef(false);
```

### Fixed Redirect Logic

```typescript
useEffect(() => {
  // ✅ GUARD: Block all redirects if navigation is in progress
  if (isNavigatingRef.current) {
    return;
  }

  // ... other redirect logic ...

  // ✅ CRITICAL FIX: Fire-and-forget onboarding redirect
  if (requiresOnboarding && isProfileLoaded && !isOnboarded && user && !onboardingRedirectFiredRef.current) {
    onboardingRedirectFiredRef.current = true; // ✅ Set BEFORE redirect
    isNavigatingRef.current = true;            // ✅ Block further redirects
    
    router.replace('/(civilian)/profile');
    return;
  }
}, [/* dependencies */]);
```

## Why This Fix Works

### 1. Navigation-In-Progress Guard (`isNavigatingRef`)
- Set to `true` **immediately before** calling `router.replace()`
- Blocks **all** redirect logic while navigation is in progress
- Prevents race conditions between redirect call and segments update

### 2. Fire-And-Forget Onboarding Redirect (`onboardingRedirectFiredRef`)
- Set to `true` **before** the redirect fires
- Ensures onboarding redirect happens **exactly once**
- Never resets (fire-and-forget pattern)

### 3. No Dependency on useSegments()
- **Removed** all `segments.includes('profile')` checks from onboarding logic
- Onboarding redirect is now **unconditional** (fires once when conditions met)
- Eliminates race condition with segments updates

## Exact Changes Made

### Lines Changed in `components/auth/protected-route.tsx`

**Line 33-35 (OLD):**
```typescript
const hasRedirectedRef = useRef(false);
const lastRedirectRoute = useRef<string | null>(null);
```

**Line 33-35 (NEW):**
```typescript
const isNavigatingRef = useRef(false);
const onboardingRedirectFiredRef = useRef(false);
```

**Lines 82-150 (OLD):**
- Complex redirect logic with `hasRedirectedRef` and `lastRedirectRoute`
- Checked `segments.includes('profile')` to detect profile page
- Reset redirect flags when route changed

**Lines 82-130 (NEW):**
- Simple guard: `if (isNavigatingRef.current) return;`
- Set `isNavigatingRef.current = true` before every redirect
- Onboarding redirect uses `onboardingRedirectFiredRef` (never resets)
- **Removed** all `segments`-based profile page detection

## Expected Behavior After Fix

### Scenario: Login with non-onboarded civilian

1. User logs in → redirected to `/(civilian)/home`
2. ProtectedRoute detects `!isOnboarded`
3. Sets `onboardingRedirectFiredRef.current = true`
4. Sets `isNavigatingRef.current = true`
5. Calls `router.replace('/(civilian)/profile')`
6. useEffect re-runs → **blocked by `isNavigatingRef.current`**
7. Navigation completes → user lands on profile page
8. **No further redirects** (onboardingRedirectFiredRef prevents it)

### No More Errors

- ✅ No "REPLACE not handled" errors
- ✅ No infinite redirect loops
- ✅ Navigation stabilizes immediately
- ✅ Profile page loads correctly

## Technical Details

### Why useRef Instead of useState?

- `useRef` persists across re-renders **without triggering re-renders**
- `useState` would cause additional re-renders, potentially triggering more redirects
- `useRef.current` can be set synchronously without waiting for React's render cycle

### Why Fire-And-Forget Pattern?

- Onboarding redirect should happen **exactly once per session**
- Once user reaches profile page, they should never be redirected again (even if they navigate away)
- Resetting the flag would risk re-triggering the redirect

### Why Remove segments Dependency?

- `segments` update **after** navigation completes (asynchronous)
- Checking `segments.includes('profile')` during navigation is unreliable
- Fire-and-forget pattern eliminates need to detect current page

## Verification

To verify the fix works:

1. Create a test user with `is_onboarded = false`
2. Log in with that user
3. Observe:
   - Single redirect to profile page
   - No console errors
   - Navigation stabilizes immediately
   - No infinite loops

## Files Modified

- `components/auth/protected-route.tsx` (Lines 33-35, 82-130)

## Summary

The infinite redirect loop was caused by a race condition between `router.replace()` and `useSegments()` updates. The fix introduces a navigation-in-progress guard (`isNavigatingRef`) that blocks all redirects during navigation, and a fire-and-forget onboarding redirect flag (`onboardingRedirectFiredRef`) that ensures the redirect fires exactly once. This eliminates the race condition and prevents infinite loops.
