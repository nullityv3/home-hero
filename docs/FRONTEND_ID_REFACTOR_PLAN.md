# Frontend ID Refactoring Plan

## Objective
Eliminate all references to `hero_profiles.id` from the frontend and ensure 100% alignment with backend contracts.

## Current Issues

### 1. **ID Confusion**
- Frontend sometimes passes `hero_profiles.id` when it should pass `profiles.id`
- Database layer correctly maps between the two, but frontend should never see `hero_profiles.id`

### 2. **Inconsistent Filtering**
- Hero dashboard filters by `req.hero_id === user?.id` (correct - uses profiles.id)
- But acceptances return `hero_id` which is `hero_profiles.id` (incorrect exposure)

### 3. **UI Guards Missing**
- No prevention of accepting already-assigned requests
- No prevention of choosing hero twice
- Accept button shows even after assignment

## Refactoring Strategy

### Phase 1: Database Layer (services/supabase.ts)
**Goal**: Never expose `hero_profiles.id` to frontend

1. **getRequestAcceptances**: Transform response to use `profile_id` instead of `hero_id`
2. **acceptRequest**: Keep internal mapping but ensure response uses `profile_id`
3. **chooseHero**: Accept `profile_id` instead of `hero_profiles.id`

### Phase 2: Store Layer (stores/requests.ts)
**Goal**: Only work with `profiles.id`

1. **acceptRequest**: Pass `profiles.id` (already correct)
2. **chooseHero**: Change signature to accept `profileId` instead of `heroProfileId`
3. **getRequestAcceptances**: Transform data to use `profile_id`

### Phase 3: UI Layer
**Goal**: Eliminate all `hero_profiles.id` references

1. **choose-hero-from-acceptances.tsx**: Use `profile_id` instead of `hero_id`
2. **hero-request-detail-modal.tsx**: Add UI guards
3. **dashboard.tsx**: Ensure filtering uses `profiles.id`

### Phase 4: Realtime Subscriptions
**Goal**: Ensure authoritative updates

1. Deduplicate by `request.id` or `acceptance.id`
2. Cleanup on unmount, logout, role switch
3. Trust backend as single source of truth

## Implementation Checklist

- [ ] Refactor `getRequestAcceptances` to return `profile_id`
- [ ] Refactor `chooseHero` to accept `profileId`
- [ ] Update `choose-hero-from-acceptances.tsx` to use `profile_id`
- [ ] Add UI guards to prevent illegal actions
- [ ] Add `hasChosen` state management
- [ ] Verify no frontend file references `hero_profiles.id`
- [ ] Test all request/acceptance flows
- [ ] Document the final contract

## Success Criteria

1. ✅ No frontend file contains `hero_profiles.id`
2. ✅ All IDs passed to backend are `profiles.id`
3. ✅ UI guards prevent illegal state transitions
4. ✅ Realtime subscriptions are authoritative
5. ✅ Backend enforces all constraints
6. ✅ Frontend cannot desync from backend
