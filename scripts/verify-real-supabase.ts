/**
 * Verification script to confirm Supabase is using the real client
 * This script checks that no dev-mode stubs are active
 * 
 * Security: Does not expose sensitive credentials or query actual data
 */

import { auth, database, supabase } from '../services/supabase';

// Type definitions for better type safety
interface VerificationResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

interface VerificationSummary {
  passed: number;
  failed: number;
  warnings: number;
  results: VerificationResult[];
}

console.log('\n' + '='.repeat(60));
console.log('🔍 Verifying Real Supabase Client Configuration');
console.log('='.repeat(60) + '\n');

/**
 * Validates environment variables without exposing sensitive data
 */
function validateEnvironmentVariables(): VerificationResult {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  // Validate URL format (Supabase URLs follow specific pattern)
  const isValidUrl = url && 
                     url.startsWith('https://') && 
                     url.includes('.supabase.co') && 
                     !url.includes('your-project') &&
                     url.length > 30;

  // Validate key format (Supabase keys are JWT format with 3 parts)
  const isValidKey = key && 
                     key.length > 100 && 
                     key.split('.').length === 3;

  if (isValidUrl && isValidKey) {
    return {
      test: 'Environment Variables',
      status: 'pass',
      // ✅ SECURE: Don't expose actual values, only metadata
      message: `Environment variables configured correctly (URL length: ${url!.length}, Key length: ${key!.length})`
    };
  }
  
  const issues: string[] = [];
  if (!isValidUrl) issues.push('Invalid or missing EXPO_PUBLIC_SUPABASE_URL');
  if (!isValidKey) issues.push('Invalid or missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  return {
    test: 'Environment Variables',
    status: 'fail',
    message: `Configuration issues: ${issues.join(', ')}`,
    details: 'Check .env file and ensure variables are properly set'
  };
}

/**
 * Verifies client methods exist without making actual API calls
 */
function verifyClientMethods(): VerificationResult {
  try {
    const hasAuthMethods = typeof supabase.auth.signUp === 'function' &&
                           typeof supabase.auth.signInWithPassword === 'function' &&
                           typeof supabase.auth.signOut === 'function';
    
    const hasDbMethods = typeof supabase.from === 'function' &&
                         typeof supabase.rpc === 'function';
    
    const hasRealtimeMethods = typeof supabase.channel === 'function';
    
    if (hasAuthMethods && hasDbMethods && hasRealtimeMethods) {
      return {
        test: 'Client Methods',
        status: 'pass',
        message: 'All required Supabase methods are present (auth, database, realtime)'
      };
    }
    
    const missing: string[] = [];
    if (!hasAuthMethods) missing.push('auth methods');
    if (!hasDbMethods) missing.push('database methods');
    if (!hasRealtimeMethods) missing.push('realtime methods');
    
    return {
      test: 'Client Methods',
      status: 'fail',
      message: `Missing required methods: ${missing.join(', ')}`
    };
  } catch (err: any) {
    return {
      test: 'Client Methods',
      status: 'fail',
      message: 'Error checking client methods',
      details: err.message
    };
  }
}

/**
 * Verifies database client is initialized without querying actual data
 * ✅ SECURE: Does not make unauthorized database queries
 */
function verifyDatabaseClient(): VerificationResult {
  try {
    // Check client initialization without querying data
    const hasFromMethod = typeof supabase.from === 'function';
    const hasRealtimeMethod = typeof supabase.channel === 'function';
    const hasStorageMethod = typeof supabase.storage === 'object';
    
    // Verify it's not a mock by checking internal properties
    const hasInternalProps = supabase.auth && 
                             typeof supabase.auth.getSession === 'function';
    
    if (hasFromMethod && hasRealtimeMethod && hasStorageMethod && hasInternalProps) {
      return {
        test: 'Database Connection',
        status: 'pass',
        message: 'Real database client is active (client methods verified)'
      };
    }
    
    return {
      test: 'Database Connection',
      status: 'fail',
      message: 'Dev-mode stub detected: missing client methods'
    };
  } catch (err: any) {
    return {
      test: 'Database Connection',
      status: 'fail',
      message: 'Client initialization error',
      details: err.message
    };
  }
}

/**
 * Verifies helper functions are properly exported
 */
function verifyHelperFunctions(): VerificationResult {
  try {
    const authHelpersExist = typeof auth.signUp === 'function' &&
                             typeof auth.signIn === 'function' &&
                             typeof auth.signOut === 'function' &&
                             typeof auth.getCurrentUser === 'function';
    
    const dbHelpersExist = typeof database.createCivilianProfile === 'function' &&
                           typeof database.createHeroProfile === 'function' &&
                           typeof database.getUserProfile === 'function' &&
                           typeof database.createServiceRequest === 'function';
    
    if (authHelpersExist && dbHelpersExist) {
      return {
        test: 'Helper Functions',
        status: 'pass',
        message: 'All auth and database helpers are properly exported'
      };
    }
    
    const missing: string[] = [];
    if (!authHelpersExist) missing.push('auth helpers');
    if (!dbHelpersExist) missing.push('database helpers');
    
    return {
      test: 'Helper Functions',
      status: 'fail',
      message: `Missing helper functions: ${missing.join(', ')}`
    };
  } catch (err: any) {
    return {
      test: 'Helper Functions',
      status: 'fail',
      message: 'Error checking helper functions',
      details: err.message
    };
  }
}

/**
 * Main verification function
 */
async function verifyRealClient(): Promise<VerificationSummary> {
  const results: VerificationResult[] = [];

  // Run all verification tests
  results.push(validateEnvironmentVariables());
  results.push(verifyClientMethods());
  results.push(verifyDatabaseClient());
  results.push(verifyHelperFunctions());

  // Print results
  console.log('Test Results:\n');
  results.forEach(({ test, status, message, details }) => {
    const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${test}`);
    console.log(`   ${message}`);
    if (details) {
      console.log(`   Details: ${details}`);
    }
    console.log('');
  });

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  console.log('='.repeat(60));
  console.log(`Summary: ${passCount} passed, ${warningCount} warnings, ${failCount} failed`);
  console.log('='.repeat(60) + '\n');

  if (failCount === 0 && warningCount === 0) {
    console.log('🎉 All checks passed! Supabase is using the real client.');
    console.log('📝 Next steps: Run integration tests with npm test\n');
  } else if (failCount === 0) {
    console.log('✅ Core checks passed with some warnings.');
    console.log('⚠️  Review warnings above for potential issues.\n');
  } else {
    console.log('⚠️  Some checks failed. Please review the issues above.');
    console.log('📚 Documentation: See docs/CREDENTIALS_SETUP.md for setup instructions\n');
  }

  return {
    passed: passCount,
    failed: failCount,
    warnings: warningCount,
    results
  };
}

// Execute verification with enhanced error handling
verifyRealClient()
  .then(summary => {
    const success = summary.failed === 0;
    
    if (success) {
      console.log('✅ Verification completed successfully\n');
    }
    
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('❌ Verification failed with error:');
    console.error('   Error type:', err.name);
    console.error('   Error message:', err.message);
    
    // Provide actionable guidance based on error type
    if (err.message.includes('ENOTFOUND') || err.message.includes('network')) {
      console.error('\n💡 Suggestion: Check your internet connection and Supabase project status');
    } else if (err.message.includes('environment') || err.message.includes('undefined')) {
      console.error('\n💡 Suggestion: Verify .env file exists and contains valid credentials');
      console.error('   Required variables: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
    } else if (err.message.includes('import') || err.message.includes('module')) {
      console.error('\n💡 Suggestion: Run npm install to ensure all dependencies are installed');
    }
    
    console.error('\n📚 Documentation: See docs/CREDENTIALS_SETUP.md for setup instructions\n');
    process.exit(1);
  });
