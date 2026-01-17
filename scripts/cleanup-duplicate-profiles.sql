-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CLEANUP DUPLICATE PROFILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This script identifies and removes duplicate profiles
-- Run this in your Supabase SQL Editor
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Step 1: Check for duplicate civilian profiles
SELECT id, COUNT(*) as count
FROM public.civilian_profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- Step 2: Check for duplicate hero profiles
SELECT id, COUNT(*) as count
FROM public.hero_profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- Step 3: If duplicates exist, keep only the most recent one for civilian profiles
-- (Uncomment and run if duplicates were found above)
/*
DELETE FROM public.civilian_profiles
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM public.civilian_profiles
  GROUP BY id
);
*/

-- Step 4: If duplicates exist, keep only the most recent one for hero profiles
-- (Uncomment and run if duplicates were found above)
/*
DELETE FROM public.hero_profiles
WHERE ctid NOT IN (
  SELECT MAX(ctid)
  FROM public.hero_profiles
  GROUP BY id
);
*/

-- Step 5: Verify no duplicates remain
SELECT 'civilian_profiles' as table_name, id, COUNT(*) as count
FROM public.civilian_profiles
GROUP BY id
HAVING COUNT(*) > 1
UNION ALL
SELECT 'hero_profiles' as table_name, id, COUNT(*) as count
FROM public.hero_profiles
GROUP BY id
HAVING COUNT(*) > 1;

-- Step 6: Add unique constraint to prevent future duplicates
-- (Only run if not already present)
ALTER TABLE public.civilian_profiles
DROP CONSTRAINT IF EXISTS civilian_profiles_id_key;

ALTER TABLE public.civilian_profiles
ADD CONSTRAINT civilian_profiles_id_key UNIQUE (id);

ALTER TABLE public.hero_profiles
DROP CONSTRAINT IF EXISTS hero_profiles_id_key;

ALTER TABLE public.hero_profiles
ADD CONSTRAINT hero_profiles_id_key UNIQUE (id);
