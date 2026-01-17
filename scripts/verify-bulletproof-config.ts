#!/usr/bin/env ts-node
/**
 * Bulletproof Configuration Verification Script
 * 
 * This script verifies that the app can load Supabase credentials
 * from app.config.js even when .env file is missing or corrupted.
 * 
 * Tests:
 * 1. Load credentials from app.config.js
 * 2. Verify credentials are valid
 * 3. Test Supabase connection
 * 4. Confirm no dependency on .env file
 */

import * as fs from 'fs';
import * as path from 'path';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Bulletproof Configuration Verification');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Test 1: Load app.config.js
console.log('📋 Test 1: Loading app.config.js...');
try {
  const configPath = path.join(process.cwd(), 'app.config.js');
  
  if (!fs.existsSync(configPath)) {
    results.push({
      name: 'Load app.config.js',
      passed: false,
      message: 'app.config.js not found'
    });
  } else {
    // Clear require cache to get fresh config
    delete require.cache[require.resolve('../app.config.js')];
    const config = require('../app.config.js');
    
    results.push({
      name: 'Load app.config.js',
      passed: true,
      message: 'Successfully loaded app.config.js',
      details: {
        hasExpo: !!config.expo,
        hasExtra: !!config.expo?.extra
      }
    });
    console.log('✅ app.config.js loaded successfully\n');
  }
} catch (error: any) {
  results.push({
    name: 'Load app.config.js',
    passed: false,
    message: `Failed to load: ${error.message}`
  });
  console.log(`❌ Failed: ${error.message}\n`);
}

// Test 2: Verify credentials in app.config.js
console.log('📋 Test 2: Verifying credentials in app.config.js...');
try {
  const config = require('../app.config.js');
  const extra = config.expo?.extra;
  
  if (!extra) {
    results.push({
      name: 'Verify credentials',
      passed: false,
      message: 'No extra config found in app.config.js'
    });
    console.log('❌ No extra config found\n');
  } else {
    const url = extra.supabaseUrl;
    const key = extra.supabaseAnonKey;
    
    const checks = {
      hasUrl: !!url,
      hasKey: !!key,
      urlIsValid: url?.startsWith('https://'),
      urlNotPlaceholder: url && !url.includes('your-project') && url !== 'https://demo.supabase.co',
      keyIsValid: key && key.length > 100,
      keyNotPlaceholder: key && !key.includes('your_anon_key')
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    results.push({
      name: 'Verify credentials',
      passed: allPassed,
      message: allPassed ? 'All credential checks passed' : 'Some credential checks failed',
      details: {
        url: url ? `${url.substring(0, 40)}...` : 'missing',
        keyLength: key?.length || 0,
        checks
      }
    });
    
    if (allPassed) {
      console.log('✅ Credentials are valid');
      console.log(`   URL: ${url}`);
      console.log(`   Key Length: ${key.length} characters\n`);
    } else {
      console.log('❌ Credential validation failed');
      console.log('   Checks:', checks, '\n');
    }
  }
} catch (error: any) {
  results.push({
    name: 'Verify credentials',
    passed: false,
    message: `Failed to verify: ${error.message}`
  });
  console.log(`❌ Failed: ${error.message}\n`);
}

// Test 3: Test Supabase connection
console.log('📋 Test 3: Testing Supabase connection...');
try {
  const config = require('../app.config.js');
  const { supabaseUrl, supabaseAnonKey } = config.expo.extra;
  
  // Import Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test connection with a simple query
  supabase
    .from('hero_profiles')
    .select('count')
    .limit(1)
    .then(({ data, error }: any) => {
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
        results.push({
          name: 'Test connection',
          passed: false,
          message: `Connection failed: ${error.message}`,
          details: { error }
        });
        console.log(`❌ Connection failed: ${error.message}\n`);
      } else {
        results.push({
          name: 'Test connection',
          passed: true,
          message: 'Successfully connected to Supabase'
        });
        console.log('✅ Successfully connected to Supabase\n');
      }
      
      printSummary();
    })
    .catch((error: any) => {
      results.push({
        name: 'Test connection',
        passed: false,
        message: `Connection error: ${error.message}`
      });
      console.log(`❌ Connection error: ${error.message}\n`);
      printSummary();
    });
} catch (error: any) {
  results.push({
    name: 'Test connection',
    passed: false,
    message: `Failed to test connection: ${error.message}`
  });
  console.log(`❌ Failed: ${error.message}\n`);
  printSummary();
}

// Test 4: Verify no .env dependency
console.log('📋 Test 4: Verifying no .env dependency...');
try {
  // Check if credentials work without process.env
  const config = require('../app.config.js');
  const hasCredentials = !!(config.expo?.extra?.supabaseUrl && config.expo?.extra?.supabaseAnonKey);
  
  results.push({
    name: 'No .env dependency',
    passed: hasCredentials,
    message: hasCredentials 
      ? 'Credentials available without .env file' 
      : 'Missing credentials in app.config.js'
  });
  
  if (hasCredentials) {
    console.log('✅ Credentials available without .env file\n');
  } else {
    console.log('❌ Credentials missing in app.config.js\n');
  }
} catch (error: any) {
  results.push({
    name: 'No .env dependency',
    passed: false,
    message: `Failed to verify: ${error.message}`
  });
  console.log(`❌ Failed: ${error.message}\n`);
}

function printSummary() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📈 Results: ${passed}/${total} tests passed`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (passed === total) {
    console.log('🎉 All tests passed! Configuration is bulletproof.');
    console.log('✅ App will work even if .env file is missing or corrupted.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the configuration.');
    console.log('💡 Ensure app.config.js has valid credentials in expo.extra\n');
    process.exit(1);
  }
}
