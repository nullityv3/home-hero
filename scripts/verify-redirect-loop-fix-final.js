/**
 * Verification Script: Infinite Redirect Loop Fix
 * 
 * This script verifies that all fixes for the infinite redirect loop are properly implemented.
 */

const fs = require('fs');
const path = require('path');

const results = [];

function addResult(test, passed, details) {
  results.push({ test, passed, details });
  console.log(`${passed ? '✅' : '❌'} ${test}`);
  if (!passed) {
    console.log(`   ${details}`);
  }
}

function readFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const normalizedPath = path.normalize(fullPath);
    
    // Security: Ensure path is within project directory
    if (!normalizedPath.startsWith(process.cwd())) {
      console.warn(`⚠️  Security: Attempted to read file outside project: ${filePath}`);
      return null;
    }
    
    return fs.readFileSync(normalizedPath, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Could not read file: ${filePath} (${error.message})`);
    return null;
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Verifying Infinite Redirect Loop Fix');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test 1: Layout has fire-once redirect guard
console.log('Test 1: Layout Fire-Once Redirect Guard');
const layoutContent = readFile('app/(civilian)/_layout.tsx');
if (!layoutContent) {
  addResult(
    'Layout file exists',
    false,
    'Could not read app/(civilian)/_layout.tsx - file may not exist'
  );
} else {
  const hasRedirectRef = layoutContent.includes('hasRedirectedRef') && 
                         layoutContent.includes('useRef(false)');
  const checksRedirectRef = layoutContent.includes('if (hasRedirectedRef.current)') ||
                            layoutContent.includes('hasRedirectedRef.current = true');
  addResult(
    'Layout has fire-once redirect guard using useRef',
    hasRedirectRef && checksRedirectRef,
    hasRedirectRef ? 'Guard exists but not properly checked' : 'Missing hasRedirectedRef useRef'
  );
}

// Test 2: Layout waits for profile resolution
console.log('\nTest 2: Layout Waits for Profile Resolution');
if (layoutContent) {
  const waitsForProfileLoaded = layoutContent.includes('if (!isProfileLoaded)') &&
                                layoutContent.includes('return');
  const hasProfileLoadedDependency = layoutContent.match(/useEffect\([^)]+\[.*isProfileLoaded.*\]/s);
  addResult(
    'Layout waits for isProfileLoaded before redirecting',
    waitsForProfileLoaded && !!hasProfileLoadedDependency,
    waitsForProfileLoaded ? 'Guard exists but missing dependency' : 'Missing isProfileLoaded guard'
  );
}

// Test 3: Layout shows loading screen
console.log('\nTest 3: Layout Loading Screen');
if (layoutContent) {
  const hasLoadingScreen = layoutContent.includes('ActivityIndicator') &&
                          layoutContent.includes('Loading profile');
  const loadingScreenBeforeTabs = layoutContent.indexOf('ActivityIndicator') < 
                                  layoutContent.indexOf('<Tabs');
  addResult(
    'Layout shows loading screen during profile load',
    hasLoadingScreen && loadingScreenBeforeTabs,
    hasLoadingScreen ? 'Loading screen exists but in wrong position' : 'Missing loading screen'
  );
}

// Test 4: Profile page reloads state after creation
console.log('\nTest 4: Profile Page State Reload');
const profileContent = readFile('app/(civilian)/profile.tsx');
const createsProfile = profileContent.includes('createCivilianProfile');
const reloadsAfterCreate = profileContent.includes('await loadUserProfile') &&
                          profileContent.indexOf('createCivilianProfile') < 
                          profileContent.indexOf('await loadUserProfile');
addResult(
  'Profile page reloads state after profile creation',
  createsProfile && reloadsAfterCreate,
  createsProfile ? 'Creates profile but missing reload' : 'Missing profile creation logic'
);

// Test 5: Profile queries don't use cache
console.log('\nTest 5: Profile Query Caching');
const supabaseContent = readFile('services/supabase.ts');
// Look for the getUserProfile function and check if it uses cache
const getUserProfileStart = supabaseContent.indexOf('getUserProfile: async');
const getUserProfileEnd = supabaseContent.indexOf('updateCivilianProfile:', getUserProfileStart);
const getUserProfileFunc = supabaseContent.substring(getUserProfileStart, getUserProfileEnd);
const noCacheInGetUserProfile = !getUserProfileFunc.includes('requestCache.get') &&
                                !getUserProfileFunc.includes('requestCache.set') &&
                                !getUserProfileFunc.includes('cachedRequest');
const hasNoCacheComment = getUserProfileFunc.includes('NO CACHING') || 
                         getUserProfileFunc.includes('no caching') ||
                         getUserProfileFunc.includes('always be fresh');
addResult(
  'getUserProfile does not use request cache',
  noCacheInGetUserProfile,
  noCacheInGetUserProfile ? 'Cache removed successfully' : 'getUserProfile still uses requestCache - this causes stale data'
);

// Test 6: User store calculates isOnboarded correctly
console.log('\nTest 6: User Store Onboarding Calculation');
const userStoreContent = readFile('stores/user.ts');
const calculatesOnboarded = userStoreContent.includes('hasCanonicalProfile') &&
                           userStoreContent.includes('hasRoleProfile') &&
                           userStoreContent.includes('isOnboarded = hasCanonicalProfile && hasRoleProfile');
const setsIsOnboarded = userStoreContent.includes('isOnboarded:') ||
                       userStoreContent.includes('isOnboarded,');
addResult(
  'User store properly calculates isOnboarded state',
  calculatesOnboarded && setsIsOnboarded,
  calculatesOnboarded ? 'Calculates but may not set state' : 'Missing onboarding calculation'
);

// Test 7: Profile page handles save errors
console.log('\nTest 7: Profile Page Error Handling');
const handlesCreateError = profileContent.includes('if (error)') &&
                          profileContent.includes('Alert.alert');
const handlesUpdateError = profileContent.includes('civilianResult.success') ||
                          profileContent.includes('profileResult.error');
addResult(
  'Profile page handles creation and update errors',
  handlesCreateError && handlesUpdateError,
  handlesCreateError ? 'Handles create errors but missing update error handling' : 'Missing error handling'
);

// Test 8: Layout imports required dependencies
console.log('\nTest 8: Layout Dependencies');
const importsActivityIndicator = layoutContent.includes('ActivityIndicator');
const importsText = layoutContent.includes('Text');
const importsView = layoutContent.includes('View');
const importsFromRN = layoutContent.includes("from 'react-native'");
addResult(
  'Layout imports ActivityIndicator, Text, and View from react-native',
  importsActivityIndicator && importsText && importsView && importsFromRN,
  'Missing required imports for loading screen'
);

// Test 9: Redirect uses replace not push
console.log('\nTest 9: Redirect Method');
const usesReplace = layoutContent.includes('router.replace') &&
                   !layoutContent.includes('router.push');
addResult(
  'Layout uses router.replace (not push) for onboarding redirect',
  usesReplace,
  'Should use router.replace to prevent back navigation to incomplete state'
);

// Test 10: Profile creation is idempotent
console.log('\nTest 10: Idempotent Profile Creation');
const createCivilianProfileFunc = supabaseContent.substring(
  supabaseContent.indexOf('createCivilianProfile:'),
  supabaseContent.indexOf('createHeroProfile:')
);
const usesUpsert = createCivilianProfileFunc.includes('.upsert(');
const hasOnConflict = createCivilianProfileFunc.includes('onConflict');
addResult(
  'createCivilianProfile uses upsert for idempotent creation',
  usesUpsert && hasOnConflict,
  usesUpsert ? 'Uses upsert but missing onConflict' : 'Should use upsert instead of insert'
);

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Verification Summary');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const percentage = Math.round((passed / total) * 100);

console.log(`Tests Passed: ${passed}/${total} (${percentage}%)\n`);

if (passed === total) {
  console.log('✅ All verification tests passed!');
  console.log('✅ Infinite redirect loop fix is properly implemented.');
  console.log('\n📝 Next Steps:');
  console.log('   1. Test the app with a fresh signup');
  console.log('   2. Verify profile completion flow');
  console.log('   3. Test logout and re-login with complete profile');
  console.log('   4. Monitor logs for any redirect loops');
} else {
  console.log('❌ Some verification tests failed.');
  console.log('❌ Please review the failed tests above and fix the issues.');
  console.log('\n📝 Failed Tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`   • ${r.test}`);
    console.log(`     ${r.details}`);
  });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Exit with appropriate code
process.exit(passed === total ? 0 : 1);
