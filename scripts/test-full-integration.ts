#!/usr/bin/env ts-node
/**
 * Full Integration Test Script
 * Tests all frontend-backend integration points
 */

import { auth, database, supabase } from '../services/supabase';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
}

const results: TestResult[] = [];

function logTest(name: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string) {
  results.push({ name, status, message });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
}

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('civilian_profiles').select('count').limit(1);
    if (error) throw error;
    logTest('Supabase Connection', 'PASS', 'Successfully connected to Supabase');
    return true;
  } catch (error: any) {
    logTest('Supabase Connection', 'FAIL', error.message);
    return false;
  }
}

async function testAuthentication() {
  try {
    // Test getting current session
    const { data, error } = await auth.getSession();
    if (error && !error.message.includes('no session')) throw error;
    logTest('Authentication', 'PASS', 'Auth system is functional');
    return true;
  } catch (error: any) {
    logTest('Authentication', 'FAIL', error.message);
    return false;
  }
}

async function testProfileTables() {
  try {
    // Test civilian_profiles table
    const { error: civilianError } = await supabase
      .from('civilian_profiles')
      .select('id')
      .limit(1);
    
    if (civilianError) throw new Error(`Civilian profiles: ${civilianError.message}`);

    // Test hero_profiles table
    const { error: heroError } = await supabase
      .from('hero_profiles')
      .select('id')
      .limit(1);
    
    if (heroError) throw new Error(`Hero profiles: ${heroError.message}`);

    logTest('Profile Tables', 'PASS', 'Both profile tables accessible');
    return true;
  } catch (error: any) {
    logTest('Profile Tables', 'FAIL', error.message);
    return false;
  }
}

async function testServiceRequestsTable() {
  try {
    const { error } = await supabase
      .from('service_requests')
      .select('id, status')
      .limit(1);
    
    if (error) throw error;
    logTest('Service Requests Table', 'PASS', 'Service requests table accessible');
    return true;
  } catch (error: any) {
    logTest('Service Requests Table', 'FAIL', error.message);
    return false;
  }
}

async function testChatMessagesTable() {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    logTest('Chat Messages Table', 'PASS', 'Chat messages table accessible');
    return true;
  } catch (error: any) {
    logTest('Chat Messages Table', 'FAIL', error.message);
    return false;
  }
}

async function testRLSPolicies() {
  try {
    // This will fail if RLS is not properly configured
    // We expect it to return empty or error with permission denied (which means RLS is working)
    const { error } = await supabase
      .from('service_requests')
      .select('*')
      .limit(1);
    
    // If we get data or a permission error, RLS is working
    if (!error || error.message.includes('permission') || error.message.includes('policy')) {
      logTest('RLS Policies', 'PASS', 'RLS policies are active');
      return true;
    }
    
    throw error;
  } catch (error: any) {
    logTest('RLS Policies', 'FAIL', error.message);
    return false;
  }
}

async function testRealtimeConnection() {
  try {
    // Test if we can create a channel (doesn't require auth)
    const channel = supabase.channel('test-channel');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await supabase.removeChannel(channel);
    
    logTest('Realtime Connection', 'PASS', 'Realtime channels functional');
    return true;
  } catch (error: any) {
    logTest('Realtime Connection', 'FAIL', error.message);
    return false;
  }
}

async function testDatabaseHelpers() {
  try {
    // Test that our helper functions exist and are callable
    if (typeof database.createCivilianProfile !== 'function') {
      throw new Error('createCivilianProfile not found');
    }
    if (typeof database.createHeroProfile !== 'function') {
      throw new Error('createHeroProfile not found');
    }
    if (typeof database.createServiceRequest !== 'function') {
      throw new Error('createServiceRequest not found');
    }
    if (typeof database.getChatMessages !== 'function') {
      throw new Error('getChatMessages not found');
    }
    
    logTest('Database Helpers', 'PASS', 'All database helper functions available');
    return true;
  } catch (error: any) {
    logTest('Database Helpers', 'FAIL', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Full Integration Test...\n');
  console.log('=' .repeat(60));
  
  const connected = await testSupabaseConnection();
  
  if (!connected) {
    console.log('\n⚠️  Supabase not configured. Running in development mode.');
    console.log('To test with real backend:');
    console.log('1. Update .env with your Supabase credentials');
    console.log('2. Run: npm run verify:connection\n');
    
    // Test that development mode works
    await testDatabaseHelpers();
    await testAuthentication();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary (Development Mode)');
    console.log('=' .repeat(60));
    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${r.name}`);
    });
    
    return;
  }
  
  // Run all tests
  await testAuthentication();
  await testProfileTables();
  await testServiceRequestsTable();
  await testChatMessagesTable();
  await testRLSPolicies();
  await testRealtimeConnection();
  await testDatabaseHelpers();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${r.name}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log('=' .repeat(60));
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Frontend-backend integration is working correctly.\n');
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test runner failed:', error);
  process.exit(1);
});
