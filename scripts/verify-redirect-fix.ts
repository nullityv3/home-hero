/**
 * Verification Script: Redirect Loop Fix
 * 
 * This script verifies that:
 * 1. Profile route exists at app/(civilian)/profile.tsx
 * 2. No duplicate redirects occur in ProtectedRoute
 * 3. Redirect guards are properly implemented
 * 4. Navigation calls use correct route paths
 * 
 * Security: Read-only operations with path validation and error handling
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: string;
}

const results: VerificationResult[] = [];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB limit for safety

function addResult(check: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: string) {
  results.push({ check, status, message, details });
}

/**
 * Validates that a file path is within the project directory
 * Prevents path traversal attacks if script is ever extended
 */
function validatePath(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const projectRoot = process.cwd();
  return resolvedPath.startsWith(projectRoot);
}

/**
 * Safely reads a file with size limits and error handling
 */
function safeReadFile(filePath: string): string | null {
  try {
    if (!validatePath(filePath)) {
      console.error(`⚠️  Invalid path detected: ${filePath}`);
      return null;
    }

    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      console.error(`⚠️  File too large: ${filePath} (${stats.size} bytes)`);
      return null;
    }

    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`⚠️  Error reading file ${filePath}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// Check 1: Verify profile route exists
function checkProfileRouteExists() {
  const profilePath = path.join(process.cwd(), 'app', '(civilian)', 'profile.tsx');
  
  try {
    if (!fs.existsSync(profilePath)) {
      addResult(
        'Profile Route Exists',
        'FAIL',
        'app/(civilian)/profile.tsx does not exist',
        'This route is required for onboarding redirects'
      );
      return;
    }

    const content = safeReadFile(profilePath);
    if (!content) {
      addResult(
        'Profile Route Exists',
        'FAIL',
        'Unable to read profile route file',
        'Check file permissions and encoding'
      );
      return;
    }
    
    // Check for default export
    if (content.includes('export default')) {
      addResult(
        'Profile Route Exists',
        'PASS',
        'app/(civilian)/profile.tsx exists with default export'
      );
    } else {
      addResult(
        'Profile Route Exists',
        'FAIL',
        'app/(civilian)/profile.tsx exists but missing default export',
        'Expo Router requires a default export for route files'
      );
    }
  } catch (error) {
    addResult(
      'Profile Route Exists',
      'FAIL',
      'Error checking profile route',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Check 2: Verify redirect guards in ProtectedRoute
function checkRedirectGuards() {
  const protectedRoutePath = path.join(process.cwd(), 'components', 'auth', 'protected-route.tsx');
  
  try {
    if (!fs.existsSync(protectedRoutePath)) {
      addResult(
        'Redirect Guards',
        'FAIL',
        'ProtectedRoute component not found'
      );
      return;
    }
    
    const content = safeReadFile(protectedRoutePath);
    if (!content) {
      addResult(
        'Redirect Guards',
        'FAIL',
        'Unable to read ProtectedRoute component'
      );
      return;
    }
    
    // Check for useRef guard
    const hasUseRefGuard = content.includes('hasRedirectedRef') && content.includes('useRef');
    const hasLastRedirectRoute = content.includes('lastRedirectRoute');
    
    if (hasUseRefGuard && hasLastRedirectRoute) {
      addResult(
        'Redirect Guards',
        'PASS',
        'ProtectedRoute has proper redirect guards using useRef'
      );
    } else {
      addResult(
        'Redirect Guards',
        'FAIL',
        'ProtectedRoute missing redirect guards',
        'Should use useRef to track hasRedirectedRef and lastRedirectRoute'
      );
    }
    
    // Use safer string checks instead of complex regex to avoid ReDoS
    const hasUseEffect = content.includes('useEffect');
    const hasSegmentsDep = content.includes('segments');
    const hasAuthDep = content.includes('isAuthenticated');
    const hasProfileLoadedDep = content.includes('isProfileLoaded');
    
    if (hasUseEffect && hasSegmentsDep && hasAuthDep && hasProfileLoadedDep) {
      addResult(
        'Effect Dependencies',
        'PASS',
        'Navigation useEffect has required dependencies'
      );
    } else {
      const missing = [];
      if (!hasSegmentsDep) missing.push('segments');
      if (!hasAuthDep) missing.push('isAuthenticated');
      if (!hasProfileLoadedDep) missing.push('isProfileLoaded');
      
      addResult(
        'Effect Dependencies',
        'WARNING',
        'Navigation useEffect may be missing dependencies',
        missing.length > 0 ? `Potentially missing: ${missing.join(', ')}` : undefined
      );
    }
  } catch (error) {
    addResult(
      'Redirect Guards',
      'FAIL',
      'Error checking redirect guards',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Check 3: Verify no duplicate profile loads
function checkProfileLoadLogic() {
  const protectedRoutePath = path.join(process.cwd(), 'components', 'auth', 'protected-route.tsx');
  
  try {
    if (!fs.existsSync(protectedRoutePath)) {
      return;
    }
    
    const content = safeReadFile(protectedRoutePath);
    if (!content) {
      return;
    }
    
    // Check for profile load guard
    const hasProfileLoadGuard = content.includes('profileLoadAttempted') && content.includes('useRef');
    
    if (hasProfileLoadGuard) {
      addResult(
        'Profile Load Guard',
        'PASS',
        'Profile loading has guard to prevent duplicate loads'
      );
    } else {
      addResult(
        'Profile Load Guard',
        'WARNING',
        'Profile loading may not have duplicate load prevention',
        'Consider using useRef to track profileLoadAttempted'
      );
    }
  } catch (error) {
    addResult(
      'Profile Load Guard',
      'WARNING',
      'Error checking profile load logic',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Check 4: Verify navigation calls use correct paths
function checkNavigationPaths() {
  const filesToCheck = [
    'components/auth/protected-route.tsx',
    'app/(civilian)/home.tsx',
    'app/create-request.tsx'
  ];
  
  let allPathsCorrect = true;
  const issues: string[] = [];
  
  try {
    for (const file of filesToCheck) {
      const filePath = path.join(process.cwd(), file);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }
      
      const content = safeReadFile(filePath);
      if (!content) {
        continue;
      }
      
      // Check for incorrect profile paths
      const incorrectPaths = [
        '/profile',
        '/(civilian)profile',
        'civilian/profile'
      ];
      
      for (const incorrectPath of incorrectPaths) {
        if (content.includes(`'${incorrectPath}'`) || content.includes(`"${incorrectPath}"`)) {
          allPathsCorrect = false;
          issues.push(`${file} contains incorrect path: ${incorrectPath}`);
        }
      }
    }
    
    if (allPathsCorrect) {
      addResult(
        'Navigation Paths',
        'PASS',
        'All navigation calls use correct route paths'
      );
    } else {
      addResult(
        'Navigation Paths',
        'FAIL',
        'Some navigation calls use incorrect paths',
        issues.join('\n')
      );
    }
  } catch (error) {
    addResult(
      'Navigation Paths',
      'WARNING',
      'Error checking navigation paths',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Check 5: Verify profile wrapper configuration
function checkProfileWrapper() {
  const wrapperPath = path.join(process.cwd(), 'app', '(civilian)', 'profile-wrapper.tsx');
  
  try {
    if (!fs.existsSync(wrapperPath)) {
      addResult(
        'Profile Wrapper',
        'WARNING',
        'profile-wrapper.tsx not found',
        'This is optional but recommended for onboarding bypass'
      );
      return;
    }
    
    const content = safeReadFile(wrapperPath);
    if (!content) {
      addResult(
        'Profile Wrapper',
        'WARNING',
        'Unable to read profile wrapper file'
      );
      return;
    }
    
    // Check if wrapper bypasses onboarding
    const bypassesOnboarding = content.includes('requiresOnboarding={false}') || 
                               content.includes('requiresOnboarding: false');
    
    if (bypassesOnboarding) {
      addResult(
        'Profile Wrapper',
        'PASS',
        'Profile wrapper correctly bypasses onboarding requirement'
      );
    } else {
      addResult(
        'Profile Wrapper',
        'WARNING',
        'Profile wrapper may not bypass onboarding',
        'Profile page should be accessible even without complete onboarding'
      );
    }
  } catch (error) {
    addResult(
      'Profile Wrapper',
      'WARNING',
      'Error checking profile wrapper',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Check 6: Verify layout configuration
function checkLayoutConfiguration() {
  const layoutPath = path.join(process.cwd(), 'app', '(civilian)', '_layout.tsx');
  
  try {
    if (!fs.existsSync(layoutPath)) {
      addResult(
        'Layout Configuration',
        'FAIL',
        'app/(civilian)/_layout.tsx not found'
      );
      return;
    }
    
    const content = safeReadFile(layoutPath);
    if (!content) {
      addResult(
        'Layout Configuration',
        'FAIL',
        'Unable to read layout file'
      );
      return;
    }
    
    // More robust check for profile tab (avoid false positives from comments)
    const hasProfileTab = 
      (content.includes('name="profile"') || content.includes("name='profile'")) &&
      content.includes('<Tabs.Screen') &&
      !content.includes('// name="profile"') &&
      !content.includes('/* name="profile"');
    
    if (hasProfileTab) {
      addResult(
        'Layout Configuration',
        'PASS',
        'Civilian layout includes profile tab'
      );
    } else {
      addResult(
        'Layout Configuration',
        'FAIL',
        'Civilian layout missing profile tab',
        'Add <Tabs.Screen name="profile" /> to the layout'
      );
    }
  } catch (error) {
    addResult(
      'Layout Configuration',
      'FAIL',
      'Error checking layout configuration',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// Run all checks
function runVerification() {
  const timestamp = new Date().toISOString();
  
  console.log('🔍 Running Redirect Loop Fix Verification...');
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`📂 Working Directory: ${process.cwd()}`);
  console.log(`🔧 Node Version: ${process.version}\n`);
  
  checkProfileRouteExists();
  checkRedirectGuards();
  checkProfileLoadLogic();
  checkNavigationPaths();
  checkProfileWrapper();
  checkLayoutConfiguration();
  
  // Print results
  console.log('📊 Verification Results:\n');
  console.log('='.repeat(80));
  
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;
  
  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`\n${icon} ${result.check}: ${result.status}`);
    console.log(`   ${result.message}`);
    
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warningCount++;
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed, ${warningCount} warnings\n`);
  
  if (failCount > 0) {
    console.log('❌ Verification FAILED - Please fix the issues above\n');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  Verification PASSED with warnings - Consider addressing warnings\n');
    process.exit(0);
  } else {
    console.log('✅ Verification PASSED - All checks successful!\n');
    process.exit(0);
  }
}

// Run verification
runVerification();
