/**
 * Simple verification that Supabase is using real client (not dev-mode stub)
 * 
 * Security: This script validates environment configuration without exposing sensitive values
 */

const fs = require('fs');
const path = require('path');

// Manually parse .env file since dotenv might not work in all environments
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env file not found at:', envPath);
      console.error('   Please create .env file from .env.example');
      process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        return;
      }
      
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return; // Skip malformed lines
      }
      
      const key = line.substring(0, separatorIndex).trim();
      let value = line.substring(separatorIndex + 1).trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      if (key) {
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    console.error('❌ Failed to read .env file:', error.message);
    process.exit(1);
  }
}

// Validate Supabase configuration format
function validateSupabaseConfig(url, key) {
  const errors = [];
  
  // Validate URL format
  if (!url) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL is missing');
  } else if (!url.startsWith('https://')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL must start with https://');
  } else if (!url.includes('.supabase.co')) {
    errors.push('EXPO_PUBLIC_SUPABASE_URL should be a valid Supabase URL');
  }
  
  // Validate anon key format (JWT tokens start with 'eyJ')
  if (!key) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
  } else if (key.length < 100) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY appears to be invalid (too short)');
  } else if (!key.startsWith('eyJ')) {
    errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY should be a valid JWT token');
  }
  
  return errors;
}

const env = loadEnvFile();

console.log('\n' + '='.repeat(60));
console.log('🔍 Verifying Real Supabase Client Configuration');
console.log('='.repeat(60) + '\n');

const results = [];

// Test 1: Check environment variables
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Environment Variables:');
console.log(`  URL: ${url ? '✓ Configured' : '✗ MISSING'}`);
console.log(`  Key: ${key ? `✓ Configured (${key.length} chars)` : '✗ MISSING'}`);

// Validate configuration format
const validationErrors = validateSupabaseConfig(url, key);
if (validationErrors.length > 0) {
  console.log('\n❌ Configuration Validation Failed:');
  validationErrors.forEach(err => console.log(`   - ${err}`));
  console.log();
  process.exit(1);
}

console.log();

// Enhanced validation
const isValidSupabaseUrl = url && 
  url.startsWith('https://') && 
  url.includes('.supabase.co') &&
  !url.includes('your-project') &&
  !url.includes('demo.supabase');

const isValidAnonKey = key && 
  key.length > 100 && // Supabase keys are typically 200+ chars
  key.split('.').length === 3 && // JWT format
  !key.includes('your_anon_key');

if (isValidSupabaseUrl && isValidAnonKey) {
  results.push({ test: 'Environment Variables', status: 'pass' });
  console.log('✅ Environment variables are properly configured\n');
} else {
  results.push({ test: 'Environment Variables', status: 'fail' });
  if (!isValidSupabaseUrl) console.log('❌ Invalid Supabase URL format (must be *.supabase.co)\n');
  if (!isValidAnonKey) console.log('❌ Invalid anon key format (must be valid JWT)\n');
}

// Test 2: Check that services/supabase.ts doesn't have dev-mode logic
try {
  const supabaseFile = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'supabase.ts'),
    'utf8'
  );

  const hasDevModeStub = supabaseFile.includes('Development mode - no database');
  const hasMockClient = supabaseFile.includes('isDevelopmentMode ?');
  const hasRealClient = supabaseFile.includes('createClient(supabaseUrl, supabaseAnonKey');

  // Additional security checks
  const hasProperErrorHandling = supabaseFile.includes('logger.supabaseResult');
  const hasRateLimiting = supabaseFile.includes('checkRateLimit');
  const hasInputValidation = supabaseFile.includes('sanitizedUpdates');
  const hasNoSensitiveLogs = !supabaseFile.includes('supabaseUrl.split') && 
                             !supabaseFile.includes('supabaseUrl.substring');

  console.log('Code Analysis:');
  console.log(`  Has dev-mode stub: ${hasDevModeStub ? '❌ YES' : '✅ NO'}`);
  console.log(`  Has mock client logic: ${hasMockClient ? '❌ YES' : '✅ NO'}`);
  console.log(`  Has real client: ${hasRealClient ? '✅ YES' : '❌ NO'}`);
  console.log();
  
  console.log('Security Features:');
  console.log(`  Error handling: ${hasProperErrorHandling ? '✅ YES' : '⚠️  NO'}`);
  console.log(`  Rate limiting: ${hasRateLimiting ? '✅ YES' : '⚠️  NO'}`);
  console.log(`  Input validation: ${hasInputValidation ? '✅ YES' : '⚠️  NO'}`);
  console.log(`  No sensitive logs: ${hasNoSensitiveLogs ? '✅ YES' : '⚠️  NO'}`);
  console.log();

  if (!hasDevModeStub && !hasMockClient && hasRealClient) {
    results.push({ test: 'Code Analysis', status: 'pass' });
    console.log('✅ Code is using real Supabase client (no dev-mode stubs)\n');
  } else {
    results.push({ test: 'Code Analysis', status: 'fail' });
    console.log('❌ Code still contains dev-mode logic\n');
  }
  
  // Warning for security features
  if (!hasNoSensitiveLogs) {
    console.log('⚠️  Warning: Code contains sensitive data in logs\n');
  }
} catch (err) {
  results.push({ test: 'Code Analysis', status: 'fail' });
  console.log('❌ Could not read supabase.ts file\n');
}

// Summary
console.log('='.repeat(60));
const passCount = results.filter(r => r.status === 'pass').length;
const failCount = results.filter(r => r.status === 'fail').length;
console.log(`Summary: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60) + '\n');

if (failCount === 0) {
  console.log('🎉 All checks passed! Supabase is configured to use the real client.\n');
  console.log('Next steps:');
  console.log('1. Start your Expo app: npm start');
  console.log('2. Try signing up or logging in');
  console.log('3. Profile creation should now work with the real database\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Please review the issues above.\n');
  process.exit(1);
}
