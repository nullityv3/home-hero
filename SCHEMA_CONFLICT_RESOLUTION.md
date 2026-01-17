# CRITICAL: Schema Conflict Resolution Required

## Problem

There is a fundamental mismatch between:
1. **Steering rules (g.md)** - Describes a 3-table architecture with `profiles` as canonical
2. **Database schema (xz.md)** - Uses 2-table architecture with direct `auth.users` references
3. **TypeScript types** - Follows g.md but doesn't match actual database

## Current State

### What g.md Says (Steering Rules)
```
auth.users.id → profiles.id → hero_profiles.profile_id
                            → civilian_profiles.profile_id
```

### What xz.md Shows (Actual Database)
```
auth.users.id → hero_profiles.user_id
             → civilian_profiles.user_id
```

### What Code Does (types/index.ts)
```typescript
// Follows g.md - uses profile_id
interface HeroProfile {
  profile_id: string;  // ❌ Column doesn't exist in database
}
```

## Impact

**ALL database operations will fail** because:
- Code queries `.eq('profile_id', userId)` 
- Database has column named `user_id`
- Result: "column profile_id does not exist" errors

## Resolution Options

### Option 1: Update Types to Match Database (FASTEST)

**Pros**: No database migration, immediate fix
**Cons**: Violates g.md steering rules

**Changes Required**:
1. Update `types/index.ts`: `profile_id` → `user_id`
2. Update all queries in `services/supabase.ts`
3. Update `stores/user.ts`
4. Update g.md to match reality

### Option 2: Migrate Database to Match g.md (CLEANEST)

**Pros**: Follows architectural vision, cleaner separation
**Cons**: Requires database migration, data migration, downtime

**Changes Required**:
1. Create `profiles` table
2. Migrate data from role tables to `profiles`
3. Rename `user_id` → `profile_id` in role tables
4. Update foreign keys
5. Test all queries

### Option 3: Hybrid Approach

Keep database as-is but update documentation:
1. Update g.md to reflect actual schema
2. Fix types to use `user_id`
3. Add migration plan for future refactor

## Recommendation

**Immediate**: Option 1 (Update types to match database)
**Long-term**: Plan Option 2 migration

## Action Items

- [ ] Decide on approach
- [ ] Update types/index.ts
- [ ] Update services/supabase.ts
- [ ] Update all stores
- [ ] Update g.md steering rules
- [ ] Test all database operations
- [ ] Update documentation

## Files Affected

- `types/index.ts` - Type definitions
- `services/supabase.ts` - Database queries
- `stores/user.ts` - User profile operations
- `stores/requests.ts` - Request operations
- `.kiro/steering/g.md` - Schema documentation
- All component files using profiles

## Risk Level: 🔴 CRITICAL

This will cause runtime failures in production.
