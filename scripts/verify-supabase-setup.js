/**
 * Verification script for bulletproof Supabase setup
 * Confirms that credentials are loaded via Constants.expoConfig.extra
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🔍 Verifying Bulletproof Supabase Setup');
console.log('='.repeat(70) + '\n');

const results = [];

// Test 1: Check app.config.js exists and has credentials
console.log('1️⃣  Checking app.config.js configuration...\n');
try {
  const configPath = path.join(__dirname, '..', 'app.config.js');
  if (!fs.existsSync(configPath)) {
    results.push({ test: 'app.config.js exists', status: 'fail', message: 'File not found' });
  } else {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    const hasExtra = configContent.includes('extra:');
    const hasUrl = configContent.includes('supabaseUrl:');
    const hasKey = configContent.includes('supabaseAnonKey:');
    const hasRealUrl = configContent.includes('htdaqadkqolmpvvbbmez');
    const hasRealKey = configContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    
    console.log(`   ✅ app.config.js exists`);
    console.log(`   ${hasExtra ? '✅' : '❌'} Has 'extra' section`);
    console.log(`   ${hasUrl ? '✅' : '❌'} Has 'supabaseUrl' field`);
    console.log(`   ${hasKey ? '✅' : '❌'} Has 'supabaseAnonKey' field`);
    console.log(`   ${hasRealUrl ? '✅' : '❌'} Contains real Supabase URL`);
    console.log(`   ${hasRealKey ? '✅' : '❌'} Contains real anon key`);
    console.log();
    
    if (hasExtra && hasUrl && hasKey && hasRealUrl && hasRealKey) {
      results.push({ test: 'app.config.js', status: 'pass', message: 'Properly configured' });
    } else {
      results.push({ test: 'app.config.js', status: 'fail', message: 'Missing or invalid configuration' });
    }
  }
} catch (err) {
  results.push({ test: 'app.config.js', status: 'fail', message: err.message });
}

// Test 2: Check services/supabase.ts uses Constants
console.log('2️⃣  Checking services/supabase.ts implementation...\n');
try {
  const supabasePath = path.join(__dirname, '..', 'services', 'supabase.ts');
  const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
  
  const importsConstants = supabaseContent.includes("import Constants from 'expo-constants'");
  const usesExpoConfig = supabaseContent.includes('Constants.expoConfig?.extra');
  const hasGetConfig = supabaseContent.includes('function getSupabaseConfig()');
  const noMockMode = !supabaseContent.includes('Development mode - no database');
  const noDevStub = !supabaseContent.includes('isDevelopmentMode ?');
  const hasRealClient = supabaseContent.includes('createClient(supabaseUrl, supabaseAnonKey');
  const hasLogging = supabaseContent.includes('Supabase Client Initialization');
  
  console.log(`   ${importsConstants ? '✅' : '❌'} Imports expo-constants`);
  console.log(`   ${usesExpoConfig ? '✅' : '❌'} Uses Constants.expoConfig.extra`);
  console.log(`   ${hasGetConfig ? '✅' : '❌'} Has getSupabaseConfig() function`);
  console.log(`   ${noMockMode ? '✅' : '❌'} No mock mode errors`);
  console.log(`   ${noDevStub ? '✅' : '❌'} No dev-mode stubs`);
  console.log(`   ${hasRealClient ? '✅' : '❌'} Creates real Supabase client`);
  console.log(`   ${hasLogging ? '✅' : '❌'} Has startup logging`);
  console.log();
  
  if (importsConstants && usesExpoConfig && hasGetConfig && noMockMode && noDevStub && hasRealClient) {
    results.push({ test: 'services/supabase.ts', status: 'pass', message: 'Properly implemented' });
  } else {
    results.push({ test: 'services/supabase.ts', status: 'fail', message: 'Missing required implementation' });
  }
} catch (err) {
  results.push({ test: 'services/supabase.ts', status: 'fail', message: err.message });
}

// Test 3: Check package.json has expo-constants
console.log('3️⃣  Checking dependencies...\n');
try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(packageContent);
  
  const hasExpoConstants = packageJson.dependencies && packageJson.dependencies['expo-constants'];
  const hasSupabaseJs = packageJson.dependencies && packageJson.dependencies['@supabase/supabase-js'];
  
  console.log(`   ${hasExpoConstants ? '✅' : '❌'} expo-constants installed`);
  console.log(`   ${hasSupabaseJs ? '✅' : '❌'} @supabase/supabase-js installed`);
  console.log();
  
  if (hasExpoConstants && hasSupabaseJs) {
    results.push({ test: 'Dependencies', status: 'pass', message: 'All required packages installed' });
  } else {
    results.push({ test: 'Dependencies', status: 'fail', message: 'Missing required packages' });
  }
} catch (err) {
  results.push({ test: 'Dependencies', status: 'fail', message: err.message });
}

// Summary
console.log('='.repeat(70));
const passCount = results.filter(r => r.status === 'pass').length;
const failCount = results.filter(r => r.status === 'fail').length;
console.log(`Summary: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(70) + '\n');

if (failCount === 0) {
  console.log('🎉 All checks passed! Supabase setup is production-ready.\n');
  console.log('✅ Configuration Strategy:');
  console.log('   1. Primary: Constants.expoConfig.extra (from app.config.js)');
  console.log('   2. Fallback: process.env (for testing)');
  console.log('   3. No mock mode - always uses real database\n');
  console.log('📝 Next Steps:');
  console.log('   1. Start your app: npm start');
  console.log('   2. Check console for "Supabase Client Initialization" log');
  console.log('   3. Verify it shows: "Source: Constants.expoConfig.extra"');
  console.log('   4. Try signing up - profile creation should work!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some checks failed. Review the issues above.\n');
  results.forEach(r => {
    if (r.status === 'fail') {
      console.log(`❌ ${r.test}: ${r.message}`);
    }
  });
  console.log();
  process.exit(1);
}
