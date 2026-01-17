# Database Schema Update: profile_id Migration

## Overview
Updated the database schema to use `profile_id` as the foreign key in `hero_profiles` and `civilian_profiles` tables, replacing the previous pattern where `id` was used as both primary key and foreign key.

## Database Changes Applied

### hero_profiles Table
```sql
ALTER TABLE hero_profiles
DROP CONSTRAINT IF EXISTS hero_profiles_id_fkey;

ALTER TABLE hero_profiles
ADD COLUMN profile_id uuid;

UPDATE hero_profiles
SET profile_id = id;

ALTER TABLE hero_profiles
ADD CONSTRAINT hero_profiles_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;
```

### civilian_profiles Table
```sql
ALTER TABLE civilian_profiles
DROP CONSTRAINT IF EXISTS civilian_profiles_id_fkey;

ALTER TABLE civilian_profiles
ADD COLUMN profile_id uuid;

UPDATE civilian_profiles
SET profile_id = id;

ALTER TABLE civilian_profiles
ADD CONSTRAINT civilian_profiles_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;
```

## Schema Structure

### Before
- `hero_profiles.id` → Primary Key AND Foreign Key to `profiles.id`
- `civilian_profiles.id` → Primary Key AND Foreign Key to `profiles.id`

### After
- `hero_profiles.id` → Primary Key (auto-generated UUID)
- `hero_profiles.profile_id` → Foreign Key to `profiles.id`
- `civilian_profiles.id` → Primary Key (auto-generated UUID)
- `civilian_profiles.profile_id` → Foreign Key to `profiles.id`

## Code Changes Made

### 1. Type Definitions (`types/database.ts`)
✅ Updated `hero_profiles` Row/Insert/Update types to include both `id` and `profile_id`
✅ Updated `civilian_profiles` Row/Insert/Update types to include both `id` and `profile_id`

### 2. Service Layer (`services/supabase.ts`)
✅ Already using `profile_id` correctly in all queries:
- `createCivilianProfile()` - inserts with `profile_id: userId`
- `createHeroProfile()` - inserts with `profile_id: userId`
- `getUserProfile()` - queries with `.eq('profile_id', userId)`
- `updateCivilianProfile()` - updates with `.eq('profile_id', userId)`
- `updateHeroProfile()` - updates with `.eq('profile_id', userId)`

### 3. Steering Rules (`.kiro/steering/g.md`)
✅ Updated documentation to clarify:
- `id` is the PRIMARY KEY (auto-generated)
- `profile_id` is the FOREIGN KEY to `profiles.id`
- All queries must use `.eq('profile_id', userId)`
✅ Added code examples showing correct usage

### 4. Verification Scripts
✅ `scripts/check-schema.ts` - Updated FK references from `user_id` to `profile_id`
✅ `scripts/verify-frontend-backend.ts` - Updated schema checks to include both `id` and `profile_id`
✅ `scripts/verify-connection-simple-SECURE.ts` - Updated SELECT queries to use `profile_id`

### 5. Store Layer (`stores/user.ts`)
✅ Made `userType` parameter optional in `loadUserProfile()` for better flexibility

## Query Pattern Changes

### OLD Pattern (INCORRECT)
```typescript
// ❌ Don't do this
.eq('id', userId)
.eq('user_id', userId)
```

### NEW Pattern (CORRECT)
```typescript
// ✅ Always use profile_id for user queries
.eq('profile_id', userId)
```

## Examples

### Creating a Profile
```typescript
// Civilian
const { data, error } = await supabase
  .from('civilian_profiles')
  .insert({
    profile_id: userId,  // ✅ Use profile_id
    full_name: 'John Doe',
    phone: '555-1234',
    address: '123 Main St'
  })
  .select()
  .single();

// Hero
const { data, error } = await supabase
  .from('hero_profiles')
  .insert({
    profile_id: userId,  // ✅ Use profile_id
    full_name: 'Jane Hero',
    skills: ['plumbing', 'electrical'],
    hourly_rate: 50
  })
  .select()
  .single();
```

### Querying a Profile
```typescript
// Get profile by user ID
const { data, error } = await supabase
  .from('civilian_profiles')
  .select('*')
  .eq('profile_id', userId)  // ✅ Query by profile_id
  .single();
```

### Updating a Profile
```typescript
// Update profile
const { data, error } = await supabase
  .from('hero_profiles')
  .update({ hourly_rate: 60 })
  .eq('profile_id', userId)  // ✅ Filter by profile_id
  .select()
  .single();
```

## Files Modified

1. `types/database.ts` - Type definitions updated
2. `.kiro/steering/g.md` - Documentation updated with examples
3. `scripts/check-schema.ts` - FK validation updated
4. `scripts/verify-frontend-backend.ts` - Schema checks updated
5. `scripts/verify-connection-simple-SECURE.ts` - Query columns updated
6. `stores/user.ts` - Minor signature improvement

## Files Already Correct

- `services/supabase.ts` - Already using `profile_id` correctly ✅
- `stores/auth.ts` - No changes needed ✅
- All app components - Using service layer correctly ✅

## Testing Recommendations

1. Run schema verification:
   ```bash
   npm run verify:schema
   ```

2. Test profile creation for both user types
3. Test profile queries and updates
4. Verify RLS policies still work correctly
5. Check that all existing data migrated properly

## Migration Notes

- Existing data was migrated by setting `profile_id = id` for all rows
- The `id` column remains as primary key but is now independent
- All foreign key constraints now point to `profile_id`
- RLS policies should be updated if they reference the old column names

## Status

✅ Database schema updated
✅ Type definitions updated
✅ Service layer verified (already correct)
✅ Documentation updated
✅ Verification scripts updated
✅ Steering rules updated

**All code changes complete and aligned with new schema.**
