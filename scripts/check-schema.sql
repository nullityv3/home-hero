-- Check civilian_profiles columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'civilian_profiles'
ORDER BY ordinal_position;

-- Check hero_profiles columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'hero_profiles'
ORDER BY ordinal_position;
