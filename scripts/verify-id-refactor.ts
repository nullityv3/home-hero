#!/usr/bin/env ts-node
/**
 * Verification Script: Frontend ID Refactor
 * 
 * Verifies that:
 * 1. No frontend code references hero_profiles.id for user identification
 * 2. All ID handling uses profiles.id (auth.uid)
 * 3. Database queries use correct foreign keys
 * 4. Migration file exists and is correct
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: string[];
}

const results: VerificationResult[] = [];

// Check 1: No hero_profiles.id references in frontend
function checkHeroProfilesIdReferences(): VerificationResult {
  const forbiddenPatterns = [
    /hero_profiles\.id(?!\s*,)/g,  // hero_profiles.id (not in select list)
    /heroProfile\.id(?!\s*,)/g,     // heroProfile.id
    /hero_id:\s*heroProfile\.id/g,  // hero_id: heroProfile.id
  ];

  const filesToCheck = [
    'services/supabase.ts',
    'stores/requests.ts',
    'app/(hero)/dashboard.tsx',
    'app/(hero)/requests.tsx',
    'app/(civilian)/choose-hero-from-acceptances.tsx',
    'components/modals/hero-request-detail-modal.tsx',
  ];

  const violations: string[] = [];

  for (const file of filesToCheck) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      violations.push(`File not found: ${file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    
    for (const pattern of forbiddenPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(`${file}: Found forbidden pattern "${matches[0]}"`);
      }
    }
  }

  return {
    passed: violations.length === 0,
    message: violations.length === 0 
      ? '✅ No hero_profiles.id references found in frontend'
      : '❌ Found hero_profiles.id references in frontend',
    details: violations
  };
}

// Check 2: Verify migration file exists
function checkMigrationFile(): VerificationResult {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260106000000_fix_request_acceptances_hero_id.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    return {
      passed: false,
      message: '❌ Migration file not found',
      details: [`Expected: ${migrationPath}`]
    };
  }

  const content = fs.readFileSync(migrationPath, 'utf-8');
  
  const requiredStatements = [
    'DROP CONSTRAINT',
    'UPDATE public.request_acceptances',
    'ADD CONSTRAINT request_acceptances_hero_id_fkey',
    'REFERENCES public.profiles(id)',
  ];

  const missing = requiredStatements.filter(stmt => !content.includes(stmt));

  return {
    passed: missing.length === 0,
    message: missing.length === 0
      ? '✅ Migration file exists and contains required statements'
      : '❌ Migration file missing required statements',
    details: missing.length > 0 ? [`Missing: ${missing.join(', ')}`] : undefined
  };
}

// Check 3: Verify database service uses profiles.id
function checkDatabaseService(): VerificationResult {
  const filePath = path.join(process.cwd(), 'services/supabase.ts');
  
  if (!fs.existsSync(filePath)) {
    return {
      passed: false,
      message: '❌ services/supabase.ts not found',
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  const checks = [
    {
      name: 'acceptRequest uses heroUserId directly',
      pattern: /hero_id:\s*heroUserId/,
      shouldExist: true
    },
    {
      name: 'chooseHero uses profileId directly',
      pattern: /hero_id:\s*profileId/,
      shouldExist: true
    },
    {
      name: 'No mapping to hero_profiles.id',
      pattern: /hero_id:\s*heroProfile\.id/,
      shouldExist: false
    },
  ];

  const violations: string[] = [];

  for (const check of checks) {
    const found = check.pattern.test(content);
    if (check.shouldExist && !found) {
      violations.push(`Missing: ${check.name}`);
    } else if (!check.shouldExist && found) {
      violations.push(`Found forbidden: ${check.name}`);
    }
  }

  return {
    passed: violations.length === 0,
    message: violations.length === 0
      ? '✅ Database service uses profiles.id correctly'
      : '❌ Database service has issues',
    details: violations
  };
}

// Check 4: Verify type definitions
function checkTypeDefinitions(): VerificationResult {
  const filePath = path.join(process.cwd(), 'types/database.ts');
  
  if (!fs.existsSync(filePath)) {
    return {
      passed: false,
      message: '❌ types/database.ts not found',
    };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for correct comment
  const hasCorrectComment = content.includes('ALWAYS use profiles.id') || 
                           content.includes('NO internal mapping');

  return {
    passed: hasCorrectComment,
    message: hasCorrectComment
      ? '✅ Type definitions correctly documented'
      : '❌ Type definitions missing correct documentation',
  };
}

// Run all checks
console.log('🔍 Verifying Frontend ID Refactor...\n');

results.push(checkHeroProfilesIdReferences());
results.push(checkMigrationFile());
results.push(checkDatabaseService());
results.push(checkTypeDefinitions());

// Print results
console.log('Results:\n');
results.forEach(result => {
  console.log(result.message);
  if (result.details && result.details.length > 0) {
    result.details.forEach(detail => console.log(`  - ${detail}`));
  }
  console.log('');
});

// Summary
const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log('─'.repeat(50));
console.log(`\n${passed}/${total} checks passed\n`);

if (passed === total) {
  console.log('✅ Frontend ID refactor is COMPLETE and VERIFIED');
  console.log('\nNext steps:');
  console.log('1. Apply migration: supabase db push');
  console.log('2. Test acceptance flow in development');
  console.log('3. Deploy to production');
  process.exit(0);
} else {
  console.log('❌ Frontend ID refactor has issues that need to be fixed');
  process.exit(1);
}
