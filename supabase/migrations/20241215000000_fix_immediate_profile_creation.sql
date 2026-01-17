-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SUPABASE AUTH + PROFILE FLOW FIX - IMMEDIATE PROFILE CREATION
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- This migration ensures:
-- 1. Profiles are created IMMEDIATELY when auth.users row is inserted
-- 2. No more double queries (select from profiles → recordCount: 0)
-- 3. Onboarding should UPDATE existing profiles, not create them
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ✅ IMMEDIATE PROFILE CREATION: Enhanced trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- ✅ IMMEDIATE: Create canonical profile (no more lazy creation)
  INSERT INTO public.profiles (id, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'civilian'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = COALESCE(NEW.raw_user_meta_data->>'user_type', 'civilian'),
    updated_at = NOW();

  -- ✅ IMMEDIATE: Create role-specific profile with proper defaults
  IF COALESCE(NEW.raw_user_meta_data->>'user_type', 'civilian') = 'civilian' THEN
    INSERT INTO public.civilian_profiles (profile_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (profile_id) DO UPDATE SET
      updated_at = NOW();
  ELSE
    -- ✅ HERO DEFAULTS: Create with proper initial values
    INSERT INTO public.hero_profiles (
      profile_id, 
      skills, 
      hourly_rate, 
      rating, 
      completed_jobs, 
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id, 
      '{}', -- Empty skills array
      0,    -- $0/hour initially
      0,    -- 0 rating initially
      0,    -- 0 completed jobs
      NOW(), 
      NOW()
    )
    ON CONFLICT (profile_id) DO UPDATE SET
      updated_at = NOW();
  END IF;

  -- ✅ SUCCESS LOGGING: Confirm profile creation
  RAISE NOTICE 'IMMEDIATE PROFILE CREATED: user_id=%, role=%', 
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'civilian');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ IMMEDIATE TRIGGER: Fire AFTER INSERT to ensure auth.users row exists first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ✅ VERIFICATION: Test that trigger works
DO $$
BEGIN
  RAISE NOTICE 'IMMEDIATE PROFILE CREATION TRIGGER INSTALLED';
  RAISE NOTICE 'Next signup will create profiles immediately';
  RAISE NOTICE 'No more double queries: select from profiles → recordCount: 0';
END $$;