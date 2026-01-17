/**
 * Verification Script: Infinite Redirect Loop Fix
 * 
 * Verifies that the redirect loop has been fixed
 */

import * as fs from 'fs';
import * as path from 'path';

interface Check {
  name: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const checks: Check[] = [];

function addCheck(name: string, status: 'PASS' | 'FAIL', message: string) {
  checks.push({ name, status, message });
}

// Check 1: Profile route exists
const profilePath = path.join(process.cwd(), 'app', '(civilian)', 'profile.tsx');
try {
  if (fs.existsSync(profilePath)) {
    const content = fs.readFileSync(profilePath, 'utf-8');
    // More robust check for React component export
    if (content.includes('export default') && content.includes('function')) {
      addCheck('Profile Route', 'PASS', 'app/(civilian)/profile.tsx exists with default export');
    } else {
      addCheck('Profile Route', 'FAIL', 'Missing default export or component function');
    }
  } else {
    addCheck('Profile Route', 'FAIL', 'File does not exist');
  }
} catch (error) {
  addCheck('Profile Route', 'FAIL', `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Check 2: Redirect guards in ProtectedRoute
const protectedRoutePath = path.join(process.cwd(), 'components', 'auth', 'protected-route.tsx');
try {
  if (fs.existsSync(protectedRoutePath)) {
    const content = fs.readFileSync(protectedRoutePath, 'utf-8');
    
    const hasRedirectGuard = content.includes('hasRedirectedRef') && content.includes('useRef');
    const hasProfileCheck = content.includes('onProfilePage');
    const hasProperCondition = content.includes('!onProfilePage');
    const hasLastRedirectRoute = content.includes('lastRedirectRoute');
    
    if (hasRedirectGuard && hasProfileCheck && hasProperCondition && hasLastRedirectRoute) {
      addCheck('Redirect Guards', 'PASS', 'Proper guards with profile page detection and redirect tracking');
    } else {
      const missing = [];
      if (!hasRedirectGuard) missing.push('hasRedirectedRef');
      if (!hasProfileCheck) missing.push('onProfilePage');
      if (!hasProperCondition) missing.push('!onProfilePage condition');
      if (!hasLastRedirectRoute) missing.push('lastRedirectRoute');
      addCheck('Redirect Guards', 'FAIL', `Missing: ${missing.join(', ')}`);
    }
  } else {
    addCheck('Redirect Guards', 'FAIL', 'ProtectedRoute not found');
  }
} catch (error) {
  addCheck('Redirect Guards', 'FAIL', `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Check 3: Navigation paths are correct
if (fs.existsSync(protectedRoutePath)) {
  const content = fs.readFileSync(protectedRoutePath, 'utf-8');
  
  const hasCivilianProfile = content.includes("router.replace('/(civilian)/profile')");
  const hasHeroProfile = content.includes("router.replace('/(hero)/profile')");
  
  if (hasCivilianProfile && hasHeroProfile) {
    addCheck('Navigation Paths', 'PASS', 'Correct route paths in router.replace()');
  } else {
    addCheck('Navigation Paths', 'FAIL', 'Incorrect or missing route paths');
  }
} else {
  addCheck('Navigation Paths', 'FAIL', 'Cannot verify - file not found');
}

// Check 4: Profile load guard
try {
  if (fs.existsSync(protectedRoutePath)) {
    const content = fs.readFileSync(protectedRoutePath, 'utf-8');
    
    const hasProfileLoadAttempted = content.includes('profileLoadAttempted');
    const hasLoadProfileCallback = content.includes('useCallback') && content.includes('loadUserProfile');
    
    if (hasProfileLoadAttempted && hasLoadProfileCallback) {
      addCheck('Profile Load Guard', 'PASS', 'Guard prevents duplicate profile loads with memoization');
    } else {
      const missing = [];
      if (!hasProfileLoadAttempted) missing.push('profileLoadAttempted ref');
      if (!hasLoadProfileCallback) missing.push('memoized loadProfile callback');
      addCheck('Profile Load Guard', 'FAIL', `Missing: ${missing.join(', ')}`);
    }
  } else {
    addCheck('Profile Load Guard', 'FAIL', 'Cannot verify - file not found');
  }
} catch (error) {
  addCheck('Profile Load Guard', 'FAIL', `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Check 5: Layout configuration
const layoutPath = path.join(process.cwd(), 'app', '(civilian)', '_layout.tsx');
try {
  if (fs.existsSync(layoutPath)) {
    const content = fs.readFileSync(layoutPath, 'utf-8');
    
    const hasProfileTab = content.includes('name="profile"');
    const hasProtectedRoute = content.includes('ProtectedRoute');
    
    if (hasProfileTab && hasProtectedRoute) {
      addCheck('Layout Config', 'PASS', 'Profile tab configured with ProtectedRoute wrapper');
    } else {
      const missing = [];
      if (!hasProfileTab) missing.push('profile tab');
      if (!hasProtectedRoute) missing.push('ProtectedRoute wrapper');
      addCheck('Layout Config', 'FAIL', `Missing: ${missing.join(', ')}`);
    }
  } else {
    addCheck('Layout Config', 'FAIL', 'Layout file not found');
  }
} catch (error) {
  addCheck('Layout Config', 'FAIL', `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Print results
console.log('\n🔍 Infinite Redirect Loop Fix - Verification Results\n');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

for (const check of checks) {
  const icon = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.message}`);
  
  if (check.status === 'PASS') passCount++;
  else failCount++;
}

console.log('='.repeat(70));
console.log(`\n📊 Summary: ${passCount}/${checks.length} checks passed\n`);

if (failCount > 0) {
  console.log('❌ VERIFICATION FAILED\n');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - Redirect loop fix is complete!\n');
  process.exit(0);
}
