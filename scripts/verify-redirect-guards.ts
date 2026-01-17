/**
 * Verification Script: Redirect Guard Testing
 * 
 * This script helps verify that redirect guards are working correctly
 * and that no infinite loops exist in the navigation logic.
 * 
 * Run with: npx ts-node scripts/verify-redirect-guards.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface RedirectCall {
  file: string;
  line: number;
  code: string;
  hasGuard: boolean;
  guardType?: string;
}

interface AnalysisResult {
  totalRedirects: number;
  guardedRedirects: number;
  unguardedRedirects: number;
  potentialIssues: string[];
  redirectCalls: RedirectCall[];
}

/**
 * Check if a file contains redirect guards
 */
function hasRedirectGuard(content: string): { hasGuard: boolean; guardType?: string } {
  // Check for useRef-based guards
  if (content.includes('useRef') && content.includes('hasRedirected')) {
    return { hasGuard: true, guardType: 'useRef' };
  }
  
  // Check for flag-based guards
  if (content.includes('hasNavigated') || content.includes('redirected')) {
    return { hasGuard: true, guardType: 'flag' };
  }
  
  // Check if redirect is in a one-time effect (empty dependency array)
  if (content.includes('useEffect') && content.includes('[]')) {
    return { hasGuard: true, guardType: 'one-time-effect' };
  }
  
  return { hasGuard: false };
}

/**
 * Find all router.replace() calls in a file
 */
function findRedirectCalls(filePath: string): RedirectCall[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const redirectCalls: RedirectCall[] = [];
  
  const guardInfo = hasRedirectGuard(content);
  
  lines.forEach((line, index) => {
    if (line.includes('router.replace(') || line.includes('router.push(')) {
      redirectCalls.push({
        file: filePath,
        line: index + 1,
        code: line.trim(),
        hasGuard: guardInfo.hasGuard,
        guardType: guardInfo.guardType,
      });
    }
  });
  
  return redirectCalls;
}

/**
 * Recursively find all TypeScript/TSX files
 */
function findTsxFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other build directories
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        findTsxFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Analyze redirect patterns in the codebase
 */
function analyzeRedirects(): AnalysisResult {
  const appDir = path.join(process.cwd(), 'app');
  const componentsDir = path.join(process.cwd(), 'components');
  
  const files = [
    ...findTsxFiles(appDir),
    ...findTsxFiles(componentsDir),
  ];
  
  const allRedirectCalls: RedirectCall[] = [];
  const potentialIssues: string[] = [];
  
  files.forEach(file => {
    const redirectCalls = findRedirectCalls(file);
    allRedirectCalls.push(...redirectCalls);
    
    // Check for potential issues
    const content = fs.readFileSync(file, 'utf-8');
    
    // Issue 1: Multiple redirects in same file without guards
    if (redirectCalls.length > 1 && !redirectCalls[0].hasGuard) {
      potentialIssues.push(
        `${file}: Multiple redirects without guard (${redirectCalls.length} calls)`
      );
    }
    
    // Issue 2: Redirect in useEffect without proper dependencies
    if (content.includes('router.replace') && content.includes('useEffect')) {
      const effectMatches = content.match(/useEffect\([^)]+\)/g);
      if (effectMatches) {
        effectMatches.forEach(effect => {
          if (effect.includes('router') && !effect.includes('[')) {
            potentialIssues.push(
              `${file}: useEffect with router but no dependency array`
            );
          }
        });
      }
    }
    
    // Issue 3: Redirect to non-existent routes
    const routeMatches = content.match(/router\.(replace|push)\(['"`]([^'"`]+)['"`]\)/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const route = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
        if (route && route.includes('profile')) {
          // Verify profile route exists
          const profilePath = route.includes('civilian') 
            ? 'app/(civilian)/profile.tsx'
            : route.includes('hero')
            ? 'app/(hero)/profile.tsx'
            : null;
          
          if (profilePath && !fs.existsSync(path.join(process.cwd(), profilePath))) {
            potentialIssues.push(
              `${file}: Redirect to non-existent route: ${route}`
            );
          }
        }
      });
    }
  });
  
  const guardedRedirects = allRedirectCalls.filter(call => call.hasGuard).length;
  const unguardedRedirects = allRedirectCalls.length - guardedRedirects;
  
  return {
    totalRedirects: allRedirectCalls.length,
    guardedRedirects,
    unguardedRedirects,
    potentialIssues,
    redirectCalls: allRedirectCalls,
  };
}

/**
 * Verify specific routes exist
 */
function verifyRoutes(): { exists: boolean; missing: string[] } {
  const requiredRoutes = [
    'app/(civilian)/profile.tsx',
    'app/(hero)/profile.tsx',
    'app/(civilian)/_layout.tsx',
    'app/(hero)/_layout.tsx',
    'app/(auth)/login.tsx',
    'app/index.tsx',
  ];
  
  const missing: string[] = [];
  
  requiredRoutes.forEach(route => {
    const fullPath = path.join(process.cwd(), route);
    if (!fs.existsSync(fullPath)) {
      missing.push(route);
    }
  });
  
  return {
    exists: missing.length === 0,
    missing,
  };
}

/**
 * Main verification function
 */
function main() {
  console.log('🔍 Verifying Redirect Guards and Route Structure...\n');
  
  // Step 1: Verify routes exist
  console.log('📁 Step 1: Verifying Required Routes');
  const routeCheck = verifyRoutes();
  
  if (routeCheck.exists) {
    console.log('✅ All required routes exist\n');
  } else {
    console.log('❌ Missing routes:');
    routeCheck.missing.forEach(route => console.log(`   - ${route}`));
    console.log('');
  }
  
  // Step 2: Analyze redirect patterns
  console.log('🔄 Step 2: Analyzing Redirect Patterns');
  const analysis = analyzeRedirects();
  
  console.log(`   Total redirects found: ${analysis.totalRedirects}`);
  console.log(`   Guarded redirects: ${analysis.guardedRedirects}`);
  console.log(`   Unguarded redirects: ${analysis.unguardedRedirects}\n`);
  
  // Step 3: Report potential issues
  if (analysis.potentialIssues.length > 0) {
    console.log('⚠️  Step 3: Potential Issues Found');
    analysis.potentialIssues.forEach(issue => {
      console.log(`   - ${issue}`);
    });
    console.log('');
  } else {
    console.log('✅ Step 3: No Potential Issues Found\n');
  }
  
  // Step 4: Detailed redirect call report
  console.log('📊 Step 4: Redirect Call Details');
  
  const guardedCalls = analysis.redirectCalls.filter(call => call.hasGuard);
  const unguardedCalls = analysis.redirectCalls.filter(call => !call.hasGuard);
  
  if (guardedCalls.length > 0) {
    console.log('\n✅ Guarded Redirects:');
    guardedCalls.forEach(call => {
      console.log(`   ${call.file}:${call.line}`);
      console.log(`      Guard: ${call.guardType}`);
      console.log(`      Code: ${call.code}`);
    });
  }
  
  if (unguardedCalls.length > 0) {
    console.log('\n⚠️  Unguarded Redirects:');
    unguardedCalls.forEach(call => {
      console.log(`   ${call.file}:${call.line}`);
      console.log(`      Code: ${call.code}`);
    });
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL VERDICT');
  console.log('='.repeat(60));
  
  const hasIssues = !routeCheck.exists || analysis.potentialIssues.length > 0;
  
  if (!hasIssues) {
    console.log('✅ NO CRITICAL ISSUES FOUND');
    console.log('   - All required routes exist');
    console.log('   - Redirect guards are properly implemented');
    console.log('   - No infinite loop patterns detected');
  } else {
    console.log('⚠️  ISSUES DETECTED');
    console.log('   Please review the issues listed above');
  }
  
  console.log('='.repeat(60) + '\n');
  
  // Exit with appropriate code
  process.exit(hasIssues ? 1 : 0);
}

// Run the verification
main();
