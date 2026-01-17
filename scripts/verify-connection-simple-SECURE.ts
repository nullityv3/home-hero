#!/usr/bin/env ts-node
/**
 * Simple Supabase Connection Verification (SECURE VERSION)
 * 
 * Security improvements:
 * - No hardcoded credentials
 * - No credential logging
 * - Proper error categorization
 * - Connection timeout
 * - Schema validation
 */

import { createClient } from '@supabase/supabase-js';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

async function verify() {
  console.log('🔍 Verifying Supabase Connection\n');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  // Load environment variables (NO FALLBACKS)
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Validate environment variables
  console.log('✅ Environment Variables');
  if (!url || !key) {
    console.log('   ❌ Missing required environment variables');
    console.log('\n💡 Required variables:');
    console.log('   - EXPO_PUBLIC_SUPABASE_URL');
    console.log('   - EXPO_PUBLIC_SUPABASE_ANON_KEY');
    console.log('\n📝 Create a .env file with these values');
    process.exit(1);
  }
  
  console.log(`   URL: ${url ? '✓ Set' : '✗ Missing'}`);
  console.log(`   Key: ${key ? '✓ Set' : '✗ Missing'}`);
  console.log();

  // Create client with timeout
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false
    },
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      }
    }
  });

  // Test 1: Check auth
  console.log('📡 Test 1: Auth System');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error && !error.message.includes('no session')) {
      throw error;
    }
    console.log('   ✅ Auth system accessible');
    results.push({ name: 'Auth', passed: true, message: 'Accessible' });
  } catch (error: any) {
    console.log('   ❌ Auth failed:', error.message);
    results.push({ name: 'Auth', passed: false, message: error.message });
    return results;
  }

  // Test 2: Check civilian_profiles table with schema validation
  console.log('\n📡 Test 2: civilian_profiles Table');
  try {
    const { data, error } = await supabase
      .from('civilian_profiles')
      .select('id, profile_id, full_name, phone, address, created_at')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST301') {
        console.log('   ⚠️  RLS Policy: No rows accessible (normal without auth)');
        results.push({ name: 'civilian_profiles', passed: true, message: 'Table exists, RLS active' });
      } else if (error.code === '42P01') {
        throw new Error('Table does not exist');
      } else if (error.message.includes('column')) {
        throw new Error(`Schema mismatch: ${error.message}`);
      } else {
        throw error;
      }
    } else {
      console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
      results.push({ name: 'civilian_profiles', passed: true, message: `${data?.length || 0} rows` });
    }
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
    console.log('   ⚠️  Make sure you\'ve run the schema from xz.md');
    results.push({ name: 'civilian_profiles', passed: false, message: error.message });
  }

  // Test 3: Check hero_profiles table
  console.log('\n📡 Test 3: hero_profiles Table');
  try {
    const { data, error } = await supabase
      .from('hero_profiles')
      .select('id, profile_id, full_name, phone, skills, hourly_rate, rating')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST301') {
        console.log('   ⚠️  RLS Policy: No rows accessible (normal without auth)');
        results.push({ name: 'hero_profiles', passed: true, message: 'Table exists, RLS active' });
      } else {
        throw error;
      }
    } else {
      console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
      results.push({ name: 'hero_profiles', passed: true, message: `${data?.length || 0} rows` });
    }
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
    results.push({ name: 'hero_profiles', passed: false, message: error.message });
  }

  // Test 4: Check service_requests table
  console.log('\n📡 Test 4: service_requests Table');
  try {
    const { data, error } = await supabase
      .from('service_requests')
      .select('id, status, civilian_id, hero_id')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST301') {
        console.log('   ⚠️  RLS Policy: No rows accessible (normal without auth)');
        results.push({ name: 'service_requests', passed: true, message: 'Table exists, RLS active' });
      } else {
        throw error;
      }
    } else {
      console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
      results.push({ name: 'service_requests', passed: true, message: `${data?.length || 0} rows` });
    }
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
    results.push({ name: 'service_requests', passed: false, message: error.message });
  }

  // Test 5: Check chat_messages table
  console.log('\n📡 Test 5: chat_messages Table');
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, request_id, sender_id, message')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST301') {
        console.log('   ⚠️  RLS Policy: No rows accessible (normal without auth)');
        results.push({ name: 'chat_messages', passed: true, message: 'Table exists, RLS active' });
      } else {
        throw error;
      }
    } else {
      console.log(`   ✅ Table accessible (${data?.length || 0} rows found)`);
      results.push({ name: 'chat_messages', passed: true, message: `${data?.length || 0} rows` });
    }
  } catch (error: any) {
    console.log('   ❌ Table error:', error.message);
    results.push({ name: 'chat_messages', passed: false, message: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All ${total} checks passed!`);
  } else {
    console.log(`⚠️  ${passed}/${total} checks passed`);
  }

  console.log('\n💡 Next steps:');
  if (passed < total) {
    console.log('   1. Run the SQL schema from xz.md in Supabase SQL Editor');
    console.log('   2. Re-run this verification script');
  } else {
    console.log('   1. Start your app: npm start');
    console.log('   2. Test signup/login functionality');
    console.log('   3. Verify RLS policies with authenticated users');
  }

  return results;
}

verify()
  .then(results => {
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  });
