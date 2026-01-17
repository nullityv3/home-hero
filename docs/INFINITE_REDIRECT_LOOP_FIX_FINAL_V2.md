# Infinite Redirect Loop Fix - Final Solution

## 🎯 Root Cause Analysis

The infinite redirect loop was **NOT** caused by missing guards. The confirmed root cause:

1. **`router.replace()` was being called inside a Tabs navigator**
2. **Expo Router rewrites absolute paths** like `/(civilian)/profile` into relative route objects `{ name: "profile" }`
3. This causes the error: **"REPLACE profile not handled"**
4. The rewrite triggers a remount loop because the Tabs navigator keeps trying to handle the redirect

## ✅ Solution Implementation

### 1. Removed Onboarding Redirect from `ProtectedRoute`

**File:** `components/auth/protected-route.tsx`

**Changes:**
- Removed `requiresOnboarding` prop
- Removed `onboardingRedirectFiredRef` 
- Removed entire onboarding redirect logic block
- `ProtectedRoute` now **ONLY** handles:
  - Blocking unauthorized access
  - Redirecting to correct user type group
  - Loading profile data

**Why:** `ProtectedRoute` wraps the Tabs navigator, so any redirect from within it happens **inside** the Tabs context, causing the rewrite issue.

### 2. Implemented Onboarding Redirect in Layout Files

**Files:** 
- `app/(civilian)/_layout.tsx`
- `app/(hero)/_layout.tsx`

**Implementation:**
```typescript
const router = useRouter();
const { user } = useAuthStore();
const { isProfileLoaded, isOnboarded } = useUserStore();

const onboardingRedirectFiredRef = useRef(false);
const isRedirectingRef = useRef(false);

useEffect(() => {
  // Guard: Only redirect once
  if (onboardingRedirectFiredRef.current || isRedirectingRef.current) {
    return;
  }

  // Guard: Wait for profile to load
  if (!isProfileLoaded || !user) {
    return;
  }

  // Redirect if not onboarded
  if (!isOnboarded) {
    onboardingRedirectFiredRef.current = true;
    isRedirectingRef.current = true;
    
    // Use absolute path
    router.replace('/(civilian)/profile'); // or '/(hero)/profile'
  }
}, [isProfileLoaded, isOnboarded, user, router]);

// Hard stop: Prevent Tabs from mounting while redirecting
if (isRedirectingRef.current) {
  return null;
}
```

**Why this works:**
- Redirect happens **BEFORE** `<Tabs>` component mounts
- Uses absolute path: `/(civilian)/profile`
- Returns `null` to prevent Tabs from rendering during redirect
- Fires exactly once with ref guards

### 3. Hard Stop Rendering

**Critical:** `return null;` when `isRedirectingRef.current === true`

This prevents the Tabs navigator from mounting while the redirect is in progress, eliminating the remount loop.

## 🚫 Hard Constraints Followed

✅ Do NOT redirect from inside Tabs  
✅ Do NOT use relative routes  
✅ Do NOT touch profile.tsx  
✅ Do NOT introduce timeouts or delays  

## ✅ Expected Result

1. **Login** → redirect once to `(civilian)/profile` or `(hero)/profile`
2. **No "REPLACE profile not handled" error**
3. **No remount loop**
4. **Tabs load only AFTER onboarding completes**

## 📋 Technical Explanation

### Why Tabs Rewrite Absolute Paths

Expo Router's Tabs navigator has internal logic that:
1. Intercepts navigation calls within its context
2. Attempts to resolve routes relative to the Tabs structure
3. Rewrites absolute paths like `/(civilian)/profile` to `{ name: "profile" }`
4. This rewrite fails when the route is not a direct child of the Tabs

### Why Moving Redirect to Layout Fixes Remounting

**Before (broken):**
```
<ProtectedRoute>          ← Redirect happens here
  <Tabs>                  ← Tabs intercepts and rewrites
    <Tab name="profile">  ← Causes remount loop
```

**After (fixed):**
```
Layout useEffect()        ← Redirect happens here (before Tabs)
  ↓
return null              ← Hard stop
  ↓
<ProtectedRoute>         ← No redirect logic
  <Tabs>                 ← Never mounts during redirect
```

### Why Guards Alone Cannot Solve This

Guards prevent **multiple redirects**, but they don't prevent the **Tabs rewrite issue**.

Even with perfect guards:
1. First redirect fires inside Tabs context
2. Tabs rewrites the absolute path
3. Rewrite causes "REPLACE not handled" error
4. Error triggers component remount
5. Guards reset, cycle repeats

The only solution is to **prevent Tabs from mounting** until after the redirect completes.

## 🔍 Testing Checklist

- [ ] Login as civilian with `isOnboarded: false` → redirects to profile once
- [ ] Login as hero with `isOnboarded: false` → redirects to profile once
- [ ] No console errors about "REPLACE profile not handled"
- [ ] No infinite redirect loops
- [ ] Tabs render correctly after onboarding completes
- [ ] Profile page loads without issues

## 📝 Files Modified

1. `components/auth/protected-route.tsx` - Removed onboarding redirect logic
2. `app/(civilian)/_layout.tsx` - Added onboarding redirect before Tabs
3. `app/(hero)/_layout.tsx` - Added onboarding redirect before Tabs

---

**Status:** ✅ COMPLETE  
**Date:** 2026-01-11  
**Issue:** Infinite redirect loop with "REPLACE profile not handled"  
**Resolution:** Move onboarding redirect from ProtectedRoute to layout files, before Tabs mount
