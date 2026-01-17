-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX PROFILE CREATION: Use 'id' instead of 'user_id'
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This migration:
-- 1. Sets up FK constraints from profile tables to auth.users
-- 2. Creates trigger to auto-create profiles on signup
-- 3. Sets up RLS policies using 'id' column
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 1: Fix Foreign Key Constraints
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.civilian_profiles
ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.civilian_profiles
DROP CONSTRAINT IF EXISTS civilian_profiles_id_fkey;

ALTER TABLE public.civilian_profiles
ADD CONSTRAINT civilian_profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.hero_profiles
ALTER COLUMN id SET NOT NULL;

ALTER TABLE public.hero_profiles
DROP CONSTRAINT IF EXISTS hero_profiles_id_fkey;

ALTER TABLE public.hero_profiles
ADD CONSTRAINT hero_profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 2: Clean + Rebuild Trigger
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile based on user_type metadata (defaults to civilian)
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'civilian') = 'hero' THEN
    INSERT INTO public.hero_profiles (id)
    VALUES (NEW.id);
  ELSE
    INSERT INTO public.civilian_profiles (id)
    VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- STEP 3: Re-enable Clean RLS Policies (using 'id' not 'user_id')
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.civilian_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own civilian profile" ON public.civilian_profiles;
DROP POLICY IF EXISTS "Users can update their own civilian profile" ON public.civilian_profiles;
DROP POLICY IF EXISTS civilian_select_self ON public.civilian_profiles;
DROP POLICY IF EXISTS civilian_update_self ON public.civilian_profiles;

DROP POLICY IF EXISTS "Users can view their own hero profile" ON public.hero_profiles;
DROP POLICY IF EXISTS "Users can update their own hero profile" ON public.hero_profiles;
DROP POLICY IF EXISTS "Anyone can view hero profiles" ON public.hero_profiles;
DROP POLICY IF EXISTS hero_select_self ON public.hero_profiles;
DROP POLICY IF EXISTS hero_update_self ON public.hero_profiles;

-- Civilian profile policies
CREATE POLICY civilian_select_self
ON public.civilian_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY civilian_update_self
ON public.civilian_profiles
FOR UPDATE
USING (auth.uid() = id);

-- Hero profile policies
CREATE POLICY hero_select_self
ON public.hero_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY hero_update_self
ON public.hero_profiles
FOR UPDATE
USING (auth.uid() = id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- GRANT PERMISSIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.civilian_profiles TO authenticated;
GRANT SELECT, UPDATE ON public.hero_profiles TO authenticated;
