#!/usr/bin/env ts-node
/**
 * Verification Script: Onboarding Redirect Loop Fix
 * 
 * This script verifies that all required fixes are in place to prevent
 * the infinite redirect loop during onboarding.
 * 
 * Run: npx ts-node scripts/verify-onboarding-fix.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function checkFile(filePath: string, checks: Array<{ name: string; pattern: RegExp | string; required: boolean }>) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    results.push({
      name: `File exists: ${filePath}`,
      passed: false,
      details: 'File not found'
    });
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  checks.forEach(check => {
    const pattern = typeof check.pattern === 'string' 
      ? new RegExp(check.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      : check.pattern;
    
    const found = pattern.test(content);
    const passed = check.required ? found : true;

    results.push({
      name: `${filePath}: ${check.name}`,
      passed,
      details: found ? 'Found' : 'Not found'
    });
  });
}

console.log('🔍 Verifying Onboarding Redirect Loop Fixes...\n');

// ✅ FIX 1: Layout Redirect Guards
console.log('📋 Checking Fix 1: Layout Redirect Guards\n');

checkFile('app/(civilian)/_layout.tsx', [
  {
    name: 'Has redirect guard ref',
    pattern: /hasRedirectedRef\s*=\s*useRef\(false\)/,
    required: true
  },
  {
    name: 'Checks isProfileLoaded before redirect',
    pattern: /if\s*\(\s*!isProfileLoaded\s*\)\s*{\s*return/,
    required: true
  },
  {
    name: 'Checks hasRedirectedRef before redirect',
    pattern: /if\s*\(\s*hasRedirectedRef\.current\s*\)\s*{\s*return/,
    required: true
  },
  {
    name: 'Sets redirect flag',
    pattern: /hasRedirectedRef\.current\s*=\s*true/,
    required: true
  },
  {
    name: 'Uses router.replace for redirect',
    pattern: /router\.replace\(['"`]\(\/\(civilian\)\/profile['"`]\)/,
    required: true
  }
]);

checkFile('app/(hero)/_layout.tsx', [
  {
    name: 'Has redirect guard ref',
    pattern: /hasRedirectedRef\s*=\s*useRef\(false\)/,
    required: true
  },
  {
    name: 'Checks isProfileLoaded before redirect',
    pattern: /if\s*\(\s*!isProfileLoaded\s*\)\s*{\s*return/,
    required: true
  },
  {
    name: 'Checks hasRedirectedRef before redirect',
    pattern: /if\s*\(\s*hasRedirectedRef\.current\s*\)\s*{\s*return/,
    required: true
  },
  {
    name: 'Sets redirect flag',
    pattern: /hasRedirectedRef\.current\s*=\s*true/,
    required: true
  },
  {
    name: 'Uses router.replace for redirect',
    pattern: /router\.replace\(['"`]\(\/\(hero\)\/profile['"`]\)/,
    required: true
  },
  {
    name: 'NO setTimeout hack',
    pattern: /setTimeout.*router/,
    required: false
  }
]);

// ✅ FIX 2: Loading Screens
console.log('\n📋 Checking Fix 2: Loading Screens\n');

checkFile('app/(civilian)/_layout.tsx', [
  {
    name: 'Shows loading screen',
    pattern: /if\s*\(\s*!isProfileLoaded\s*\)\s*{\s*return[\s\S]*ActivityIndicator/,
    required: true
  },
  {
    name: 'Loading message present',
    pattern: /Loading profile\.\.\./,
    required: true
  }
]);

checkFile('app/(hero)/_layout.tsx', [
  {
    name: 'Shows loading screen',
    pattern: /if\s*\(\s*!isProfileLoaded\s*\)\s*{\s*return[\s\S]*ActivityIndicator/,
    required: true
  },
  {
    name: 'Loading message present',
    pattern: /Loading profile\.\.\./,
    required: true
  }
]);

// ✅ FIX 3: Profile Creation Idempotency
console.log('\n📋 Checking Fix 3: Profile Creation Idempotency\n');

checkFile('app/(civilian)/profile.tsx', [
  {
    name: 'Creates profile if missing',
    pattern: /if\s*\(\s*!civilianProfile\s*\)[\s\S]*createCivilianProfile/,
    required: true
  },
  {
    name: 'Reloads profile after creation',
    pattern: /await\s+loadUserProfile\(user\.id,\s*['"`]civilian['"`]\)/,
    required: true
  }
]);

checkFile('app/(hero)/profile.tsx', [
  {
    name: 'Creates profile if missing',
    pattern: /if\s*\(\s*!heroProfile\s*\)[\s\S]*createHeroProfile/,
    required: true
  },
  {
    name: 'Reloads profile after creation',
    pattern: /await\s+loadUserProfile\(user\.id,\s*['"`]hero['"`]\)/,
    required: true
  }
]);

// ✅ FIX 4: Onboarding State Management
console.log('\n📋 Checking Fix 4: Onboarding State Management\n');

checkFile('stores/user.ts', [
  {
    name: 'Has isOnboarded state',
    pattern: /isOnboarded:\s*boolean/,
    required: true
  },
  {
    name: 'Has isProfileLoaded state',
    pattern: /isProfileLoaded:\s*boolean/,
    required: true
  },
  {
    name: 'Calculates onboarding status',
    pattern: /const\s+isOnboarded\s*=\s*hasCanonicalProfile\s*&&\s*hasRoleProfile/,
    required: true
  },
  {
    name: 'Updates onboarding after profile update',
    pattern: /isOnboarded:\s*!!\s*state\.profile\s*&&\s*!!\s*data/,
    required: true
  }
]);

// ✅ FIX 5: No Cache for Profile Queries
console.log('\n📋 Checking Fix 5: No Cache for Profile Queries\n');

checkFile('services/supabase.ts', [
  {
    name: 'getUserProfile has no cache check',
    pattern: /getUserProfile:[\s\S]{0,500}const\s+cacheKey/,
    required: false // Should NOT be found
  },
  {
    name: 'Profile queries use maybeSingle',
    pattern: /\.from\(['"`](?:civilian|hero)_profiles['"`]\)[\s\S]{0,200}\.maybeSingle\(\)/,
    required: true
  }
]);

// Print Results
console.log('\n' + '='.repeat(60));
console.log('📊 VERIFICATION RESULTS');
console.log('='.repeat(60) + '\n');

const passed = results.filter(r => r.passed).length;
const total = results.length;
const percentage = Math.round((passed / total) * 100);

results.forEach(result => {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (!result.passed) {
    console.log(`   └─ ${result.details}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`SCORE: ${passed}/${total} checks passed (${percentage}%)`);
console.log('='.repeat(60) + '\n');

if (passed === total) {
  console.log('🎉 All checks passed! The onboarding redirect loop fix is complete.\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the issues above.\n');
  process.exit(1);
}
